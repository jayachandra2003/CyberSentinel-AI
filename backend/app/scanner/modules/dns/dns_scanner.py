"""
Phase 3.2.1 — Real DNS Scanner Module.

Performs live DNS lookups for A, AAAA, MX, NS, TXT, and CNAME record types
against a user-supplied target domain using the dnspython library.

Design principles:
- Implements IScannerModule so it plugs directly into ScanOrchestrator.
- Each record-type lookup is independent; a failure for one type does not
  abort the others.
- All I/O (dns.resolver calls) runs in a thread pool via asyncio.to_thread so
  the event loop is never blocked.
- Returns a fully structured DnsScanResult serialised to Dict[str, Any] for
  downstream storage and frontend consumption.
"""
from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List

import dns.resolver

from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.dns.dns_models import (
    DnsLookupStatus,
    DnsRecordResult,
    DnsRecordType,
    DnsScanResult,
)
from app.scanner.modules.dns.utils import (
    classify_dns_exception,
    derive_security_observations,
    sanitise_domain,
    validate_domain,
)


# Default resolver timeout (seconds per nameserver) and lifetime (total query)
_QUERY_TIMEOUT: float = 5.0
_QUERY_LIFETIME: float = 10.0


def _build_resolver() -> dns.resolver.Resolver:
    """
    Return a fresh Resolver with conservative timeouts.
    We use Google and Cloudflare as fallback nameservers so that missing
    /etc/resolv.conf (common in CI) does not cause all queries to fail.
    """
    resolver = dns.resolver.Resolver()
    resolver.timeout = _QUERY_TIMEOUT
    resolver.lifetime = _QUERY_LIFETIME
    # Prefer system nameservers; fall back to well-known public resolvers if
    # the system list is empty (e.g. Docker containers without resolv.conf).
    if not resolver.nameservers:
        resolver.nameservers = ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
    return resolver


# ---------------------------------------------------------------------------
# Synchronous per-record-type lookup functions (run in thread pool)
# ---------------------------------------------------------------------------

def _lookup_A(domain: str, resolver: dns.resolver.Resolver) -> DnsRecordResult:
    t0 = time.perf_counter()
    try:
        answer = resolver.resolve(domain, "A")
        records = [
            {"address": rdata.address, "ttl": answer.rrset.ttl}
            for rdata in answer
        ]
        return DnsRecordResult(
            record_type=DnsRecordType.A,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )
    except Exception as exc:
        status, message = classify_dns_exception(exc)
        return DnsRecordResult(
            record_type=DnsRecordType.A,
            status=status,
            error=message,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )


def _lookup_AAAA(domain: str, resolver: dns.resolver.Resolver) -> DnsRecordResult:
    t0 = time.perf_counter()
    try:
        answer = resolver.resolve(domain, "AAAA")
        records = [
            {"address": rdata.address, "ttl": answer.rrset.ttl}
            for rdata in answer
        ]
        return DnsRecordResult(
            record_type=DnsRecordType.AAAA,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )
    except Exception as exc:
        status, message = classify_dns_exception(exc)
        return DnsRecordResult(
            record_type=DnsRecordType.AAAA,
            status=status,
            error=message,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )


def _lookup_MX(domain: str, resolver: dns.resolver.Resolver) -> DnsRecordResult:
    t0 = time.perf_counter()
    try:
        answer = resolver.resolve(domain, "MX")
        records = [
            {
                "preference": rdata.preference,
                "exchange": str(rdata.exchange).rstrip("."),
                "ttl": answer.rrset.ttl,
            }
            for rdata in answer
        ]
        # Sort by preference ascending (lowest = highest priority)
        records.sort(key=lambda r: r["preference"])
        return DnsRecordResult(
            record_type=DnsRecordType.MX,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )
    except Exception as exc:
        status, message = classify_dns_exception(exc)
        return DnsRecordResult(
            record_type=DnsRecordType.MX,
            status=status,
            error=message,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )


def _lookup_NS(domain: str, resolver: dns.resolver.Resolver) -> DnsRecordResult:
    t0 = time.perf_counter()
    try:
        answer = resolver.resolve(domain, "NS")
        records = [
            {"nameserver": str(rdata.target).rstrip("."), "ttl": answer.rrset.ttl}
            for rdata in answer
        ]
        return DnsRecordResult(
            record_type=DnsRecordType.NS,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )
    except Exception as exc:
        status, message = classify_dns_exception(exc)
        return DnsRecordResult(
            record_type=DnsRecordType.NS,
            status=status,
            error=message,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )


def _lookup_TXT(domain: str, resolver: dns.resolver.Resolver) -> DnsRecordResult:
    t0 = time.perf_counter()
    try:
        answer = resolver.resolve(domain, "TXT")
        records = []
        for rdata in answer:
            # Each TXT rdata may contain multiple strings; join them.
            values = [s.decode("utf-8", errors="replace") for s in rdata.strings]
            records.append({"values": values, "ttl": answer.rrset.ttl})
        return DnsRecordResult(
            record_type=DnsRecordType.TXT,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )
    except Exception as exc:
        status, message = classify_dns_exception(exc)
        return DnsRecordResult(
            record_type=DnsRecordType.TXT,
            status=status,
            error=message,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )


def _lookup_CNAME(domain: str, resolver: dns.resolver.Resolver) -> DnsRecordResult:
    t0 = time.perf_counter()
    try:
        answer = resolver.resolve(domain, "CNAME")
        records = [
            {"target": str(rdata.target).rstrip("."), "ttl": answer.rrset.ttl}
            for rdata in answer
        ]
        return DnsRecordResult(
            record_type=DnsRecordType.CNAME,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )
    except Exception as exc:
        status, message = classify_dns_exception(exc)
        return DnsRecordResult(
            record_type=DnsRecordType.CNAME,
            status=status,
            error=message,
            query_time_ms=round((time.perf_counter() - t0) * 1000, 2),
        )


# ---------------------------------------------------------------------------
# Mapping of record-type → synchronous lookup function
# ---------------------------------------------------------------------------

_LOOKUP_MAP = {
    DnsRecordType.A: _lookup_A,
    DnsRecordType.AAAA: _lookup_AAAA,
    DnsRecordType.MX: _lookup_MX,
    DnsRecordType.NS: _lookup_NS,
    DnsRecordType.TXT: _lookup_TXT,
    DnsRecordType.CNAME: _lookup_CNAME,
}

# The record types to query, in the order they are reported.
_RECORD_TYPES: List[DnsRecordType] = [
    DnsRecordType.A,
    DnsRecordType.AAAA,
    DnsRecordType.MX,
    DnsRecordType.NS,
    DnsRecordType.TXT,
    DnsRecordType.CNAME,
]


# ---------------------------------------------------------------------------
# DNSScanner — IScannerModule implementation
# ---------------------------------------------------------------------------

class DNSScanner(IScannerModule):
    """
    Production DNS scanner module.

    Implements IScannerModule.run(target) and performs parallel asynchronous
    DNS lookups for A, AAAA, MX, NS, TXT, and CNAME records.

    Usage (standalone):
        scanner = DNSScanner()
        result = await scanner.run("example.com")

    Usage (via ScanOrchestrator):
        orchestrator.register_module(DNSScanner())
    """

    @property
    def module_id(self) -> str:
        return "dns"

    async def run(self, target: str) -> Dict[str, Any]:
        """
        Execute defensive DNS analysis against *target*.

        Steps:
        1. Sanitise and validate the domain.
        2. If validation fails, return an error result immediately.
        3. For each record type, dispatch a synchronous dns.resolver call to
           a thread-pool worker via asyncio.to_thread (keeps the event loop
           free for other coroutines).
        4. All lookups run concurrently via asyncio.gather.
        5. Derive security observations from the aggregated results.
        6. Return DnsScanResult.model_dump() — a plain dict ready for JSON
           serialisation or storage in the scan repository.
        """
        domain = sanitise_domain(target)
        is_valid, reason = validate_domain(domain)

        if not is_valid:
            error_result = DnsScanResult(
                status="error",
                target=target,
                results={},
                failed_lookups=list(DnsRecordType),
                security_observations=[f"Invalid target domain: {reason}"],
            )
            return error_result.model_dump()

        resolver = _build_resolver()

        # Dispatch all lookups concurrently
        tasks = [
            asyncio.to_thread(_LOOKUP_MAP[rtype], domain, resolver)
            for rtype in _RECORD_TYPES
        ]
        lookup_results: List[DnsRecordResult] = await asyncio.gather(*tasks)

        # Aggregate results keyed by record type string
        results_dict: Dict[str, DnsRecordResult] = {}
        total_records = 0
        failed_lookups: List[str] = []

        for rtype, result in zip(_RECORD_TYPES, lookup_results):
            key = rtype.value  # "A", "AAAA", etc.
            results_dict[key] = result

            if result.status == DnsLookupStatus.OK:
                total_records += len(result.records)
            elif result.status not in (DnsLookupStatus.NO_ANSWER,):
                # NO_ANSWER is expected for many record types and is not a failure
                failed_lookups.append(key)

        # Build plain dict for security observation helper
        raw_for_observations = {
            k: v.model_dump() for k, v in results_dict.items()
        }
        observations = derive_security_observations(raw_for_observations)

        scan_result = DnsScanResult(
            module_id="dns",
            status="completed",
            target=domain,
            results=results_dict,
            total_records_found=total_records,
            failed_lookups=failed_lookups,
            security_observations=observations,
        )
        return scan_result.model_dump()

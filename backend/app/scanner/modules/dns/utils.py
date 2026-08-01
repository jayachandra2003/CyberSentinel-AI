"""
Utility helpers for the DNS Scanner module.

Responsibilities:
- Domain input sanitisation and validation (strips schemes, ports, paths).
- DNS exception mapping to DnsLookupStatus.
- Security observation derivation from raw DNS results.
"""
from __future__ import annotations

import re
from typing import List, Dict, Any

import dns.exception
import dns.resolver

from app.scanner.modules.dns.dns_models import DnsLookupStatus


# ---------------------------------------------------------------------------
# Domain validation
# ---------------------------------------------------------------------------

# RFC-compliant domain label pattern: 1-63 chars, starts/ends with alnum.
_LABEL_RE = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$")

# Maximum domain length per RFC 1035
_MAX_DOMAIN_LEN = 253


def sanitise_domain(raw: str) -> str:
    """
    Strip scheme (http://, https://), port numbers, and any path/query
    component from a user-supplied string so that only the bare hostname
    remains.

    Examples:
        "https://example.com/path?q=1" → "example.com"
        "mail.example.com:587"          → "mail.example.com"
        "  EXAMPLE.COM  "               → "example.com"
    """
    raw = raw.strip().lower()
    # Remove scheme
    raw = re.sub(r"^https?://", "", raw)
    # Remove port
    raw = re.sub(r":\d+", "", raw)
    # Remove path, query, fragment
    raw = re.split(r"[/?#]", raw, maxsplit=1)[0]
    return raw.rstrip(".")


def validate_domain(domain: str) -> tuple[bool, str]:
    """
    Validate a bare domain name.  Returns (is_valid, reason).

    Rules enforced:
    - Must not be empty.
    - Overall length ≤ 253 characters.
    - At least two labels (e.g. "example.com").
    - Each label matches RFC 1035: 1–63 alnum / hyphen chars, no leading or
      trailing hyphen.
    """
    if not domain:
        return False, "Domain is empty."

    if len(domain) > _MAX_DOMAIN_LEN:
        return False, f"Domain exceeds maximum length of {_MAX_DOMAIN_LEN} characters."

    labels = domain.split(".")
    if len(labels) < 2:
        return False, "Domain must contain at least one dot (e.g. 'example.com')."

    for label in labels:
        if not label:
            return False, "Domain contains an empty label (consecutive dots)."
        if not _LABEL_RE.match(label):
            return False, (
                f"Label '{label}' is invalid. Labels must be 1–63 alphanumeric "
                "characters or hyphens and must not start or end with a hyphen."
            )

    return True, ""


# ---------------------------------------------------------------------------
# DNS exception → DnsLookupStatus mapping
# ---------------------------------------------------------------------------

def classify_dns_exception(exc: Exception) -> tuple[DnsLookupStatus, str]:
    """
    Map a dns.exception.*  (or generic) exception to a DnsLookupStatus and a
    human-readable error message.
    """
    if isinstance(exc, dns.resolver.NXDOMAIN):
        return DnsLookupStatus.NXDOMAIN, "Domain does not exist (NXDOMAIN)."
    if isinstance(exc, dns.resolver.NoAnswer):
        return DnsLookupStatus.NO_ANSWER, "No records of this type found (NOERROR / empty answer)."
    if isinstance(exc, dns.resolver.NoNameservers):
        return DnsLookupStatus.ERROR, "No nameservers could be reached for this domain."
    if isinstance(exc, (dns.exception.Timeout, dns.resolver.LifetimeTimeout)):
        return DnsLookupStatus.TIMEOUT, "DNS query timed out."
    return DnsLookupStatus.ERROR, f"DNS lookup failed: {type(exc).__name__}: {exc}"


# ---------------------------------------------------------------------------
# Security observation derivation
# ---------------------------------------------------------------------------

def derive_security_observations(results: Dict[str, Any]) -> List[str]:
    """
    Examine raw aggregated DNS results and return a list of plain-English
    security observations that are surfaced in the final report.

    Each observation is a non-empty string describing a notable finding.
    This function is deliberately read-only and never raises.
    """
    observations: List[str] = []

    try:
        # SPF check via TXT records
        txt_result = results.get("TXT", {})
        txt_records = txt_result.get("records", [])
        spf_records = [
            r for r in txt_records
            if any(v.startswith("v=spf1") for v in r.get("values", []))
        ]
        if txt_result.get("status") == DnsLookupStatus.OK:
            if not spf_records:
                observations.append(
                    "No SPF record detected. The domain is vulnerable to email spoofing."
                )
            elif len(spf_records) > 1:
                observations.append(
                    f"Multiple SPF records detected ({len(spf_records)}). "
                    "RFC 7208 requires exactly one SPF record."
                )
            else:
                # Check for overly permissive SPF
                spf_val = " ".join(spf_records[0].get("values", []))
                if "+all" in spf_val:
                    observations.append(
                        "SPF record uses '+all' mechanism — allows any host to send mail "
                        "on behalf of this domain. This is a critical misconfiguration."
                    )
                elif "~all" in spf_val:
                    observations.append(
                        "SPF record uses '~all' (softfail). Consider upgrading to '-all' "
                        "for strict rejection of unauthorised senders."
                    )

        # DMARC check via TXT _dmarc subdomain (informational note — we don't query
        # _dmarc separately here, but note its absence if no DMARC-style record found)
        dmarc_records = [
            r for r in txt_records
            if any(v.startswith("v=DMARC1") for v in r.get("values", []))
        ]
        if txt_result.get("status") == DnsLookupStatus.OK and not dmarc_records:
            observations.append(
                "No DMARC record found in TXT results. "
                "Run a dedicated _dmarc subdomain query for a full DMARC assessment."
            )

        # MX check
        mx_result = results.get("MX", {})
        if mx_result.get("status") == DnsLookupStatus.NO_ANSWER:
            observations.append(
                "No MX records found. This domain cannot receive email."
            )

        # AAAA check
        aaaa_result = results.get("AAAA", {})
        if aaaa_result.get("status") == DnsLookupStatus.NO_ANSWER:
            observations.append(
                "No AAAA records found. Domain is not reachable over IPv6."
            )

        # CNAME at apex check (zone apex CNAME is an RFC violation)
        a_result = results.get("A", {})
        cname_result = results.get("CNAME", {})
        if (
            a_result.get("status") == DnsLookupStatus.OK
            and cname_result.get("status") == DnsLookupStatus.OK
            and cname_result.get("records")
        ):
            observations.append(
                "Both A and CNAME records are present. "
                "A CNAME at the zone apex is technically an RFC 1912 violation."
            )

        # NS record presence
        ns_result = results.get("NS", {})
        if ns_result.get("status") == DnsLookupStatus.OK:
            ns_records = ns_result.get("records", [])
            if len(ns_records) < 2:
                observations.append(
                    "Only one NS record found. Best practice requires at least two "
                    "nameservers for redundancy."
                )

    except Exception:
        # Observation derivation must never crash the scanner pipeline
        pass

    return observations

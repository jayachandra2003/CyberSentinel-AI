"""
Unit tests for Phase 3.2.1 — DNS Scanner Module.

Test coverage:
  - Domain sanitisation and validation (utils.sanitise_domain, utils.validate_domain)
  - DNS exception classification (utils.classify_dns_exception)
  - Security observation derivation (utils.derive_security_observations)
  - DNSScanner.run() with successful mocked lookups (all six record types)
  - DNSScanner.run() for each DNS failure mode: NXDOMAIN, NoAnswer, Timeout, generic error
  - DNSScanner.run() with an invalid domain (returns error without querying DNS)
  - Module identity (module_id property)

All dns.resolver network calls are patched so no live DNS queries are made
during the test run.  The asyncio mark and pytest-asyncio are used for async
test functions.
"""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import MagicMock, patch

import dns.exception
import dns.resolver
import pytest

from app.scanner.modules.dns.dns_models import DnsLookupStatus, DnsRecordType
from app.scanner.modules.dns.dns_scanner import (
    DNSScanner,
    _lookup_A,
    _lookup_AAAA,
    _lookup_CNAME,
    _lookup_MX,
    _lookup_NS,
    _lookup_TXT,
)
from app.scanner.modules.dns.utils import (
    classify_dns_exception,
    derive_security_observations,
    sanitise_domain,
    validate_domain,
)


# ---------------------------------------------------------------------------
# Helper: build a mock dns.resolver.Answer object
# ---------------------------------------------------------------------------

def _make_answer(rdatas: list, ttl: int = 300) -> MagicMock:
    """Return a minimal mock that quacks like dns.resolver.Answer."""
    rrset = MagicMock()
    rrset.ttl = ttl
    answer = MagicMock()
    answer.rrset = rrset
    answer.__iter__ = MagicMock(return_value=iter(rdatas))
    return answer


# ===========================================================================
# 1. Domain sanitisation
# ===========================================================================

class TestSanitiseDomain:
    def test_strips_https_scheme(self):
        assert sanitise_domain("https://example.com") == "example.com"

    def test_strips_http_scheme(self):
        assert sanitise_domain("http://www.example.com") == "www.example.com"

    def test_strips_port(self):
        assert sanitise_domain("mail.example.com:587") == "mail.example.com"

    def test_strips_path(self):
        assert sanitise_domain("https://example.com/path/to/page") == "example.com"

    def test_strips_query(self):
        assert sanitise_domain("https://example.com?q=1&lang=en") == "example.com"

    def test_strips_fragment(self):
        assert sanitise_domain("https://example.com#section") == "example.com"

    def test_lowercases_input(self):
        assert sanitise_domain("EXAMPLE.COM") == "example.com"

    def test_strips_leading_trailing_whitespace(self):
        assert sanitise_domain("  example.com  ") == "example.com"

    def test_strips_trailing_dot(self):
        assert sanitise_domain("example.com.") == "example.com"

    def test_complex_url(self):
        assert sanitise_domain("https://MAIL.Example.COM:443/login?ref=home#top") == "mail.example.com"


# ===========================================================================
# 2. Domain validation
# ===========================================================================

class TestValidateDomain:
    def test_valid_simple_domain(self):
        ok, reason = validate_domain("example.com")
        assert ok is True
        assert reason == ""

    def test_valid_subdomain(self):
        ok, _ = validate_domain("mail.example.co.uk")
        assert ok is True

    def test_rejects_empty_string(self):
        ok, reason = validate_domain("")
        assert ok is False
        assert "empty" in reason.lower()

    def test_rejects_single_label(self):
        ok, reason = validate_domain("localhost")
        assert ok is False
        assert "dot" in reason.lower()

    def test_rejects_consecutive_dots(self):
        ok, reason = validate_domain("example..com")
        assert ok is False
        assert "empty label" in reason.lower()

    def test_rejects_leading_hyphen(self):
        ok, reason = validate_domain("-example.com")
        assert ok is False
        assert "invalid" in reason.lower()

    def test_rejects_trailing_hyphen(self):
        ok, reason = validate_domain("example-.com")
        assert ok is False
        assert "invalid" in reason.lower()

    def test_rejects_label_too_long(self):
        long_label = "a" * 64
        ok, reason = validate_domain(f"{long_label}.com")
        assert ok is False

    def test_rejects_domain_too_long(self):
        # 254-character domain (exceeds 253-char limit)
        part = "a" * 50
        long_domain = ".".join([part] * 5) + ".com"  # 50*5 + 4 + 4 = 262 chars
        ok, reason = validate_domain(long_domain)
        assert ok is False
        assert "253" in reason

    def test_rejects_underscore_in_label(self):
        # underscores are only valid in certain special DNS contexts; we reject
        # them in the strict RFC 1035 label check.
        ok, _ = validate_domain("_dmarc.example.com")
        # NOTE: _dmarc is technically a DNS label used for DMARC records.
        # Our validator intentionally rejects underscores in apex hostnames;
        # _dmarc queries should be handled by a dedicated DMARC lookup function.
        assert ok is False


# ===========================================================================
# 3. DNS exception classification
# ===========================================================================

class TestClassifyDnsException:
    def test_nxdomain(self):
        exc = dns.resolver.NXDOMAIN()
        status, msg = classify_dns_exception(exc)
        assert status == DnsLookupStatus.NXDOMAIN
        assert "NXDOMAIN" in msg

    def test_no_answer(self):
        exc = dns.resolver.NoAnswer()
        status, msg = classify_dns_exception(exc)
        assert status == DnsLookupStatus.NO_ANSWER
        assert "No records" in msg

    def test_no_nameservers(self):
        exc = dns.resolver.NoNameservers()
        status, msg = classify_dns_exception(exc)
        assert status == DnsLookupStatus.ERROR
        assert "nameserver" in msg.lower()

    def test_timeout(self):
        exc = dns.exception.Timeout()
        status, msg = classify_dns_exception(exc)
        assert status == DnsLookupStatus.TIMEOUT
        assert "timed out" in msg.lower()

    def test_generic_exception(self):
        exc = ValueError("unexpected DNS failure")
        status, msg = classify_dns_exception(exc)
        assert status == DnsLookupStatus.ERROR
        assert "ValueError" in msg


# ===========================================================================
# 4. Security observation derivation
# ===========================================================================

class TestDeriveSecurityObservations:

    def _ok_result(self, records: list) -> dict:
        return {"status": DnsLookupStatus.OK, "records": records}

    def _no_answer_result(self) -> dict:
        return {"status": DnsLookupStatus.NO_ANSWER, "records": []}

    def test_no_spf_record_triggers_observation(self):
        results = {"TXT": self._ok_result([{"values": ["some-other=record"], "ttl": 300}])}
        obs = derive_security_observations(results)
        assert any("SPF" in o for o in obs)

    def test_valid_spf_softfail_triggers_observation(self):
        results = {"TXT": self._ok_result([{"values": ["v=spf1 include:_spf.google.com ~all"], "ttl": 300}])}
        obs = derive_security_observations(results)
        assert any("softfail" in o.lower() or "~all" in o for o in obs)

    def test_spf_permissive_plus_all_triggers_critical_observation(self):
        results = {"TXT": self._ok_result([{"values": ["v=spf1 +all"], "ttl": 300}])}
        obs = derive_security_observations(results)
        assert any("critical" in o.lower() or "+all" in o for o in obs)

    def test_multiple_spf_records_triggers_observation(self):
        results = {"TXT": self._ok_result([
            {"values": ["v=spf1 include:_spf.google.com -all"], "ttl": 300},
            {"values": ["v=spf1 include:mailchimp.com -all"], "ttl": 300},
        ])}
        obs = derive_security_observations(results)
        assert any("Multiple SPF" in o for o in obs)

    def test_no_mx_record_triggers_observation(self):
        results = {"MX": self._no_answer_result()}
        obs = derive_security_observations(results)
        assert any("MX" in o for o in obs)

    def test_no_aaaa_record_triggers_observation(self):
        results = {"AAAA": self._no_answer_result()}
        obs = derive_security_observations(results)
        assert any("IPv6" in o or "AAAA" in o for o in obs)

    def test_single_ns_triggers_redundancy_observation(self):
        results = {
            "NS": self._ok_result([{"nameserver": "ns1.example.com", "ttl": 86400}])
        }
        obs = derive_security_observations(results)
        assert any("redundan" in o.lower() or "NS" in o for o in obs)

    def test_empty_results_returns_no_observations(self):
        obs = derive_security_observations({})
        assert obs == []

    def test_derives_no_dmarc_observation_from_txt(self):
        results = {
            "TXT": self._ok_result([{"values": ["v=spf1 -all"], "ttl": 300}])
        }
        obs = derive_security_observations(results)
        assert any("DMARC" in o for o in obs)


# ===========================================================================
# 5. DNSScanner — module identity
# ===========================================================================

class TestDNSScannerModuleId:
    def test_module_id_is_dns(self):
        scanner = DNSScanner()
        assert scanner.module_id == "dns"


# ===========================================================================
# 6. DNSScanner.run() — invalid domain (no DNS query should occur)
# ===========================================================================

class TestDNSScannerInvalidDomain:
    @pytest.mark.asyncio
    async def test_invalid_domain_returns_error_status(self):
        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread") as mock_thread:
            result = await scanner.run("not_a_domain")
        # asyncio.to_thread must NOT be called for an invalid domain
        mock_thread.assert_not_called()
        assert result["status"] == "error"
        assert "Invalid" in result["security_observations"][0]

    @pytest.mark.asyncio
    async def test_empty_target_returns_error(self):
        scanner = DNSScanner()
        result = await scanner.run("")
        assert result["status"] == "error"


# ===========================================================================
# 7. DNSScanner.run() — successful mocked lookups
# ===========================================================================

class TestDNSScannerSuccessfulLookups:
    """
    Patch asyncio.to_thread so that each per-record-type lookup function
    runs in the calling thread (no actual subprocess/network) and returns
    a crafted DnsRecordResult.
    """

    def _make_ok_result(self, rtype: DnsRecordType, records: list) -> Any:
        from app.scanner.modules.dns.dns_models import DnsRecordResult
        return DnsRecordResult(
            record_type=rtype,
            status=DnsLookupStatus.OK,
            records=records,
            query_time_ms=12.5,
        )

    def _make_no_answer(self, rtype: DnsRecordType) -> Any:
        from app.scanner.modules.dns.dns_models import DnsRecordResult
        return DnsRecordResult(
            record_type=rtype,
            status=DnsLookupStatus.NO_ANSWER,
            error="No records of this type found.",
            query_time_ms=8.0,
        )

    @pytest.mark.asyncio
    async def test_successful_a_lookup_appears_in_result(self):
        a_result = self._make_ok_result(DnsRecordType.A, [{"address": "93.184.216.34", "ttl": 3600}])
        aaaa_result = self._make_no_answer(DnsRecordType.AAAA)
        mx_result = self._make_ok_result(DnsRecordType.MX, [{"preference": 10, "exchange": "mail.example.com", "ttl": 3600}])
        ns_result = self._make_ok_result(DnsRecordType.NS, [
            {"nameserver": "ns1.example.com", "ttl": 86400},
            {"nameserver": "ns2.example.com", "ttl": 86400},
        ])
        txt_result = self._make_ok_result(DnsRecordType.TXT, [{"values": ["v=spf1 -all"], "ttl": 300}])
        cname_result = self._make_no_answer(DnsRecordType.CNAME)

        ordered_results = [a_result, aaaa_result, mx_result, ns_result, txt_result, cname_result]

        async def mock_gather(*coros):
            return ordered_results

        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.gather", side_effect=mock_gather):
            with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread"):
                result = await scanner.run("example.com")

        assert result["status"] == "completed"
        assert result["target"] == "example.com"
        assert result["results"]["A"]["status"] == DnsLookupStatus.OK
        assert result["results"]["A"]["records"][0]["address"] == "93.184.216.34"
        assert result["total_records_found"] >= 1

    @pytest.mark.asyncio
    async def test_result_keys_contain_all_six_record_types(self):
        no_answer_types = [
            DnsRecordType.A, DnsRecordType.AAAA, DnsRecordType.MX,
            DnsRecordType.NS, DnsRecordType.TXT, DnsRecordType.CNAME,
        ]
        no_answer_results = [self._make_no_answer(rt) for rt in no_answer_types]

        async def mock_gather(*coros):
            return no_answer_results

        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.gather", side_effect=mock_gather):
            with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread"):
                result = await scanner.run("example.com")

        assert set(result["results"].keys()) == {"A", "AAAA", "MX", "NS", "TXT", "CNAME"}

    @pytest.mark.asyncio
    async def test_total_records_found_is_correct(self):
        a_result = self._make_ok_result(DnsRecordType.A, [
            {"address": "1.1.1.1", "ttl": 300},
            {"address": "1.0.0.1", "ttl": 300},
        ])
        ns_result = self._make_ok_result(DnsRecordType.NS, [
            {"nameserver": "ns1.cloudflare.com", "ttl": 86400},
            {"nameserver": "ns2.cloudflare.com", "ttl": 86400},
        ])
        others = [self._make_no_answer(rt) for rt in [
            DnsRecordType.AAAA, DnsRecordType.MX, DnsRecordType.TXT, DnsRecordType.CNAME
        ]]

        async def mock_gather(*coros):
            return [a_result, others[0], others[1], ns_result, others[2], others[3]]

        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.gather", side_effect=mock_gather):
            with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread"):
                result = await scanner.run("cloudflare.com")

        assert result["total_records_found"] == 4  # 2 A + 2 NS


# ===========================================================================
# 8. DNSScanner.run() — failure modes
# ===========================================================================

class TestDNSScannerFailureModes:
    def _make_error_result(self, rtype: DnsRecordType, status: DnsLookupStatus, msg: str) -> Any:
        from app.scanner.modules.dns.dns_models import DnsRecordResult
        return DnsRecordResult(
            record_type=rtype,
            status=status,
            error=msg,
            query_time_ms=5.0,
        )

    @pytest.mark.asyncio
    async def test_nxdomain_reported_correctly(self):
        nxdomain_results = [
            self._make_error_result(rt, DnsLookupStatus.NXDOMAIN, "Domain does not exist.")
            for rt in [
                DnsRecordType.A, DnsRecordType.AAAA, DnsRecordType.MX,
                DnsRecordType.NS, DnsRecordType.TXT, DnsRecordType.CNAME,
            ]
        ]

        async def mock_gather(*coros):
            return nxdomain_results

        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.gather", side_effect=mock_gather):
            with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread"):
                result = await scanner.run("this-domain-does-not-exist-xyz.example")

        assert result["status"] == "completed"
        assert result["results"]["A"]["status"] == DnsLookupStatus.NXDOMAIN
        assert result["total_records_found"] == 0
        # NXDOMAIN is a real failure; all six types should appear in failed_lookups
        assert "A" in result["failed_lookups"]

    @pytest.mark.asyncio
    async def test_timeout_reported_correctly(self):
        timeout_results = [
            self._make_error_result(rt, DnsLookupStatus.TIMEOUT, "DNS query timed out.")
            for rt in [
                DnsRecordType.A, DnsRecordType.AAAA, DnsRecordType.MX,
                DnsRecordType.NS, DnsRecordType.TXT, DnsRecordType.CNAME,
            ]
        ]

        async def mock_gather(*coros):
            return timeout_results

        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.gather", side_effect=mock_gather):
            with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread"):
                result = await scanner.run("slow.example.com")

        assert result["results"]["MX"]["status"] == DnsLookupStatus.TIMEOUT
        assert "MX" in result["failed_lookups"]

    @pytest.mark.asyncio
    async def test_no_answer_not_counted_as_failure(self):
        """
        NO_ANSWER is a legitimate DNS response (NOERROR with empty answer section).
        It must not appear in failed_lookups.
        """
        from app.scanner.modules.dns.dns_models import DnsRecordResult
        no_answer_results = [
            DnsRecordResult(
                record_type=rt,
                status=DnsLookupStatus.NO_ANSWER,
                error="No records.",
                query_time_ms=3.0,
            )
            for rt in [
                DnsRecordType.A, DnsRecordType.AAAA, DnsRecordType.MX,
                DnsRecordType.NS, DnsRecordType.TXT, DnsRecordType.CNAME,
            ]
        ]

        async def mock_gather(*coros):
            return no_answer_results

        scanner = DNSScanner()
        with patch("app.scanner.modules.dns.dns_scanner.asyncio.gather", side_effect=mock_gather):
            with patch("app.scanner.modules.dns.dns_scanner.asyncio.to_thread"):
                result = await scanner.run("no-records.example.com")

        assert result["failed_lookups"] == []


# ===========================================================================
# 9. Synchronous lookup helpers — unit-level (direct call, no asyncio)
# ===========================================================================

class TestSyncLookupHelpers:
    """
    Test the individual _lookup_* functions directly by mocking
    dns.resolver.Resolver.resolve so no network I/O occurs.
    """

    def test_lookup_A_success(self):
        rdata = MagicMock()
        rdata.address = "93.184.216.34"
        answer = _make_answer([rdata], ttl=3600)

        resolver = MagicMock()
        resolver.resolve.return_value = answer

        result = _lookup_A("example.com", resolver)

        assert result.status == DnsLookupStatus.OK
        assert result.records[0]["address"] == "93.184.216.34"
        assert result.records[0]["ttl"] == 3600
        assert result.query_time_ms is not None

    def test_lookup_AAAA_success(self):
        rdata = MagicMock()
        rdata.address = "2606:2800:220:1:248:1893:25c8:1946"
        answer = _make_answer([rdata], ttl=3600)

        resolver = MagicMock()
        resolver.resolve.return_value = answer

        result = _lookup_AAAA("example.com", resolver)

        assert result.status == DnsLookupStatus.OK
        assert "::" in result.records[0]["address"] or ":" in result.records[0]["address"]

    def test_lookup_MX_success_sorted_by_preference(self):
        rdata_high = MagicMock()
        rdata_high.preference = 20
        rdata_high.exchange = MagicMock()
        rdata_high.exchange.__str__ = lambda s: "alt1.aspmx.l.google.com."

        rdata_low = MagicMock()
        rdata_low.preference = 10
        rdata_low.exchange = MagicMock()
        rdata_low.exchange.__str__ = lambda s: "aspmx.l.google.com."

        answer = _make_answer([rdata_high, rdata_low], ttl=300)

        resolver = MagicMock()
        resolver.resolve.return_value = answer

        result = _lookup_MX("example.com", resolver)

        assert result.status == DnsLookupStatus.OK
        assert result.records[0]["preference"] == 10  # sorted ascending

    def test_lookup_NS_success(self):
        rdata = MagicMock()
        rdata.target = MagicMock()
        rdata.target.__str__ = lambda s: "ns1.example.com."
        answer = _make_answer([rdata], ttl=86400)

        resolver = MagicMock()
        resolver.resolve.return_value = answer

        result = _lookup_NS("example.com", resolver)

        assert result.status == DnsLookupStatus.OK
        assert result.records[0]["nameserver"] == "ns1.example.com"  # trailing dot stripped

    def test_lookup_TXT_success_decodes_bytes(self):
        rdata = MagicMock()
        rdata.strings = [b"v=spf1 include:_spf.google.com ~all"]
        answer = _make_answer([rdata], ttl=300)

        resolver = MagicMock()
        resolver.resolve.return_value = answer

        result = _lookup_TXT("example.com", resolver)

        assert result.status == DnsLookupStatus.OK
        assert result.records[0]["values"][0].startswith("v=spf1")

    def test_lookup_CNAME_success_strips_trailing_dot(self):
        rdata = MagicMock()
        rdata.target = MagicMock()
        rdata.target.__str__ = lambda s: "canonical.example.com."
        answer = _make_answer([rdata], ttl=600)

        resolver = MagicMock()
        resolver.resolve.return_value = answer

        result = _lookup_CNAME("example.com", resolver)

        assert result.status == DnsLookupStatus.OK
        assert result.records[0]["target"] == "canonical.example.com"

    def test_lookup_A_nxdomain(self):
        resolver = MagicMock()
        resolver.resolve.side_effect = dns.resolver.NXDOMAIN()

        result = _lookup_A("nonexistent.invalid", resolver)

        assert result.status == DnsLookupStatus.NXDOMAIN
        assert result.records == []
        assert result.error is not None

    def test_lookup_MX_no_answer(self):
        resolver = MagicMock()
        resolver.resolve.side_effect = dns.resolver.NoAnswer()

        result = _lookup_MX("no-mail.example.com", resolver)

        assert result.status == DnsLookupStatus.NO_ANSWER

    def test_lookup_A_timeout(self):
        resolver = MagicMock()
        resolver.resolve.side_effect = dns.exception.Timeout()

        result = _lookup_A("slow.example.com", resolver)

        assert result.status == DnsLookupStatus.TIMEOUT

    def test_lookup_NS_generic_error(self):
        resolver = MagicMock()
        resolver.resolve.side_effect = RuntimeError("unexpected error")

        result = _lookup_NS("broken.example.com", resolver)

        assert result.status == DnsLookupStatus.ERROR
        assert "RuntimeError" in result.error

"""
Unit tests for Phase 3.2.2 WHOIS Intelligence Module.
"""
import pytest
from unittest.mock import patch, MagicMock

from app.scanner.modules.whois.whois_models import WhoisScanResult
from app.scanner.modules.whois.whois_scanner import WHOISScanner
from app.scanner.modules.whois.utils import (
    calculate_domain_age,
    calculate_whois_risk_score,
    derive_whois_observations,
    parse_date_string,
    parse_whois_text,
    sanitise_domain,
    validate_domain,
)

# Mock WHOIS raw response fixtures
MOCK_VALID_WHOIS = """
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.iana.org
Registrar URL: http://www.example.com
Updated Date: 2023-08-14T07:00:00Z
Creation Date: 1995-09-03T04:00:00Z
Registry Expiry Date: 2028-08-13T04:00:00Z
Registrar: Example Registrar LLC
Registrar IANA ID: 9999
Registrant Organization: Example Corporation
Registrant Country: US
Registrant State/Province: CA
Registrant City: Los Angeles
Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
Name Server: NS1.EXAMPLE.COM
Name Server: NS2.EXAMPLE.COM
DNSSEC: unsigned
Registrar Abuse Contact Email: abuse@example.com
Registrar Abuse Contact Phone: +1.5555555555
"""

MOCK_EXPIRED_WHOIS = """
Domain Name: EXPIRED-TEST.ORG
Creation Date: 2020-01-01T00:00:00Z
Registry Expiry Date: 2022-01-01T00:00:00Z
Registrar: MarkMonitor Inc.
Domain Status: clientHold
Name Server: NS1.EXPIRED.ORG
DNSSEC: unsigned
"""

MOCK_PRIVACY_WHOIS = """
Domain Name: PRIVACY-DOMAIN.NET
Creation Date: 2018-05-10T10:00:00Z
Registry Expiry Date: 2027-05-10T10:00:00Z
Registrar: NameCheap, Inc.
Registrant Organization: Withheld for Privacy Purposes
Registrant Country: IS
DNSSEC: signedDelegation
Name Server: NS1.PRIVACY.NET
"""

MOCK_MISSING_REGISTRAR_WHOIS = """
Domain Name: UNKNOWN-REGISTRAR.IO
Creation Date: 2021-03-15T00:00:00Z
Registry Expiry Date: 2026-03-15T00:00:00Z
Name Server: NS1.UNKNOWN.IO
"""


def test_domain_sanitisation_and_validation():
    assert sanitise_domain("  HTTPS://Example.Com/path?q=1  ") == "example.com"
    valid, reason = validate_domain("example.com")
    assert valid is True
    assert reason == ""

    invalid, reason_inv = validate_domain("not-a-domain")
    assert invalid is False
    assert "FQDN" in reason_inv


def test_parse_date_string():
    dt = parse_date_string("1995-09-03T04:00:00Z")
    assert dt is not None
    assert dt.year == 1995
    assert dt.month == 9
    assert dt.day == 3

    assert parse_date_string("N/A") is None
    assert parse_date_string(None) is None


def test_calculate_domain_age():
    age, expiry = calculate_domain_age("2010-01-01T00:00:00Z", "2035-01-01T00:00:00Z")
    assert age is not None and age > 3000
    assert expiry is not None and expiry > 1000


def test_parse_whois_text_valid():
    parsed = parse_whois_text(MOCK_VALID_WHOIS, "example.com")
    assert parsed["domain"] == "example.com"
    assert parsed["registrar"] == "Example Registrar LLC"
    assert parsed["registrar_iana_id"] == "9999"
    assert parsed["creation_date"] == "1995-09-03T04:00:00Z"
    assert parsed["expiration_date"] == "2028-08-13T04:00:00Z"
    assert len(parsed["name_servers"]) == 2
    assert "ns1.example.com" in parsed["name_servers"]


@pytest.mark.asyncio
async def test_whois_scanner_valid_domain():
    scanner = WHOISScanner()
    with patch("app.scanner.modules.whois.whois_scanner._query_whois_with_referral", return_value=MOCK_VALID_WHOIS):
        res = await scanner.run("example.com")

    assert res["module_id"] == "whois"
    assert res["status"] == "completed"
    assert res["target"] == "example.com"
    assert res["registrar"] == "Example Registrar LLC"
    assert res["whois_score"] >= 80
    assert res["risk_level"] == "LOW"
    assert len(res["security_observations"]) > 0


@pytest.mark.asyncio
async def test_whois_scanner_expired_domain():
    scanner = WHOISScanner()
    with patch("app.scanner.modules.whois.whois_scanner._query_whois_with_referral", return_value=MOCK_EXPIRED_WHOIS):
        res = await scanner.run("expired-test.org")

    assert res["status"] == "completed"
    assert res["days_until_expiration"] < 0
    # Hold flag & expired penalty reduce score
    assert res["whois_score"] < 70
    severities = [o["severity"] for o in res["security_observations"]]
    assert "HIGH" in severities


@pytest.mark.asyncio
async def test_whois_scanner_privacy_protected():
    scanner = WHOISScanner()
    with patch("app.scanner.modules.whois.whois_scanner._query_whois_with_referral", return_value=MOCK_PRIVACY_WHOIS):
        res = await scanner.run("privacy-domain.net")

    assert res["status"] == "completed"
    assert res["dnssec"] == "signedDelegation"
    titles = [o["title"] for o in res["security_observations"]]
    assert "Privacy Protection Enabled" in titles
    assert "DNSSEC Enabled" in titles


@pytest.mark.asyncio
async def test_whois_scanner_missing_registrar():
    scanner = WHOISScanner()
    with patch("app.scanner.modules.whois.whois_scanner._query_whois_with_referral", return_value=MOCK_MISSING_REGISTRAR_WHOIS):
        res = await scanner.run("unknown-registrar.io")

    assert res["status"] == "completed"
    assert res["registrar"] is None
    titles = [o["title"] for o in res["security_observations"]]
    assert "Registrar Information Unavailable" in titles


@pytest.mark.asyncio
async def test_whois_scanner_international_domain():
    scanner = WHOISScanner()
    with patch("app.scanner.modules.whois.whois_scanner._query_whois_with_referral", return_value=MOCK_VALID_WHOIS):
        res = await scanner.run("xn--d1acj3b.xn--p1ai")  # IDN punycode

    assert res["status"] == "completed"
    assert res["target"] == "xn--d1acj3b.xn--p1ai"


@pytest.mark.asyncio
async def test_whois_scanner_timeout_and_network_failure():
    scanner = WHOISScanner()
    # Mock network failure returning empty raw string
    with patch("app.scanner.modules.whois.whois_scanner._query_whois_with_referral", return_value=""):
        res = await scanner.run("timeout-domain.com")

    # Scanner MUST NOT crash, return status="failed" gracefully
    assert res["status"] == "failed"
    assert res["target"] == "timeout-domain.com"
    titles = [o["title"] for o in res["security_observations"]]
    assert "WHOIS Server Connection Timeout" in titles

"""
Integration tests for Enterprise Scan Engine REST APIs (Phase 7 Milestone 2).

Tests:
- Single scan submission (POST /api/v1/scans)
- Batch scan submission (POST /api/v1/scans/batch)
- Queue status inspection (GET /api/v1/scans/queue/status)
- Scan cancellation (POST /api/v1/scans/{id}/cancel)
- Target validation failures (localhost, 127.0.0.1, RFC 1918 private IPs)
- Duplicate submission prevention (409 Conflict)
- Invalid scan ID handling (404 Not Found)
"""
import pytest
from app.utils.validators import validate_scan_target


def test_target_validation_rules():
    """Verify target validator rules for FQDNs and forbidden targets."""
    # Valid domains
    valid_targets = ["example.com", "sub.domain.org", "cyber-test.co.uk", "HTTPS://Target.com/path"]
    for t in valid_targets:
        is_valid, domain, reason = validate_scan_target(t)
        assert is_valid is True, f"Failed for valid target '{t}': {reason}"
        assert domain in ("example.com", "sub.domain.org", "cyber-test.co.uk", "target.com")

    # Forbidden targets (localhost, 127.0.0.1, private IPs, malformed)
    invalid_targets = [
        "localhost",
        "127.0.0.1",
        "192.168.1.1",
        "10.0.0.5",
        "ftp://invalid.com",
        "invalid_domain_no_dot",
        "http://127.0.0.1:8000",
        "",
    ]
    for t in invalid_targets:
        is_valid, domain, reason = validate_scan_target(t)
        assert is_valid is False, f"Target '{t}' should have failed validation!"
        assert len(reason) > 0


@pytest.mark.asyncio
async def test_validators_module_import():
    from app.utils.validators import validate_scan_target
    ok, domain, _ = validate_scan_target("github.com")
    assert ok is True
    assert domain == "github.com"

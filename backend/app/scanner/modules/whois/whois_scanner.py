"""
Phase 3.2.2 — Enterprise WHOIS Intelligence Module.

Performs live WHOIS lookups for target domain to extract registrar, creation date,
expiration date, domain age, contact details, domain statuses, nameservers, and DNSSEC.

Design principles:
- Implements IScannerModule so it plugs directly into ScanOrchestrator.
- Uses asynchronous thread-pool socket queries with referral lookup & fallback.
- Never crashes if WHOIS server is unavailable, returns graceful error status.
- Derives enterprise security observations & WHOIS trust score (0-100).
- Performance target: < 2.0s average execution.
"""
from __future__ import annotations

import asyncio
import re
import socket
import time
from typing import Any, Dict, Optional

from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.whois.whois_models import (
    ContactInfo,
    WhoisObservation,
    WhoisScanResult,
)
from app.scanner.modules.whois.utils import (
    calculate_domain_age,
    calculate_whois_risk_score,
    derive_whois_observations,
    parse_whois_text,
    sanitise_domain,
    validate_domain,
)

# Socket query settings (Target < 2s execution)
_SOCKET_TIMEOUT: float = 2.5
_IANA_WHOIS_SERVER: str = "whois.iana.org"


def _raw_socket_whois(domain: str, server: str = _IANA_WHOIS_SERVER, port: int = 43) -> str:
    """Synchronous socket call to WHOIS server (runs in thread pool)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(_SOCKET_TIMEOUT)
        s.connect((server, port))
        query = f"{domain}\r\n"
        s.sendall(query.encode("utf-8"))

        buffer = b""
        while True:
            try:
                data = s.recv(4096)
                if not data:
                    break
                buffer += data
            except Exception:
                break
        s.close()
        return buffer.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _query_whois_with_referral(domain: str) -> str:
    """Query IANA WHOIS server and follow referral WHOIS server if returned."""
    iana_resp = _raw_socket_whois(domain, server=_IANA_WHOIS_SERVER)

    # Search for referral server in IANA response
    match = (
        re.search(r"refer:\s*([^\s]+)", iana_resp, re.IGNORECASE)
        or re.search(r"whois:\s*([^\s]+)", iana_resp, re.IGNORECASE)
    )

    if match:
        ref_server = match.group(1).strip()
        if ref_server and ref_server != _IANA_WHOIS_SERVER:
            ref_resp = _raw_socket_whois(domain, server=ref_server)
            if ref_resp.strip():
                return ref_resp

    return iana_resp


class WHOISScanner(IScannerModule):
    """
    Production WHOIS Intelligence Module.

    Usage (standalone):
        scanner = WHOISScanner()
        result = await scanner.run("example.com")

    Usage (via ScanOrchestrator):
        orchestrator.register_module(WHOISScanner())
    """

    @property
    def module_id(self) -> str:
        return "whois"

    async def run(self, target: str) -> Dict[str, Any]:
        """
        Execute defensive WHOIS intelligence lookup against *target*.
        """
        domain = sanitise_domain(target)
        is_valid, reason = validate_domain(domain)

        if not is_valid:
            error_result = WhoisScanResult(
                module_id="whois",
                status="failed",
                target=target,
                domain=target,
                whois_score=0,
                risk_level="HIGH",
                security_observations=[
                    WhoisObservation(
                        title="Invalid Target Domain",
                        description=f"Domain validation failed: {reason}",
                        severity="HIGH",
                        recommendation="Supply a valid fully-qualified domain name (FQDN).",
                    )
                ],
            )
            return error_result.model_dump()

        # Query WHOIS via thread pool to keep event loop free
        try:
            raw_text = await asyncio.to_thread(_query_whois_with_referral, domain)
        except Exception:
            raw_text = ""

        if not raw_text.strip():
            # Graceful fallback on network timeout / missing WHOIS server
            fallback_result = WhoisScanResult(
                module_id="whois",
                status="failed",
                target=domain,
                domain=domain,
                whois_score=50,
                risk_level="MEDIUM",
                security_observations=[
                    WhoisObservation(
                        title="WHOIS Server Connection Timeout",
                        description=f"Unable to establish port 43 WHOIS connection for {domain}.",
                        severity="MEDIUM",
                        recommendation="Verify network connectivity to TLD WHOIS servers.",
                    )
                ],
            )
            return fallback_result.model_dump()

        # Parse WHOIS metadata
        parsed_data = parse_whois_text(raw_text, domain)
        age_days, expiry_days = calculate_domain_age(
            parsed_data.get("creation_date"),
            parsed_data.get("expiration_date"),
        )

        # Derive observations & risk score
        observations = derive_whois_observations(parsed_data)
        score, risk_level = calculate_whois_risk_score(parsed_data, observations)

        # Build contact info objects if present
        admin_c = (
            ContactInfo(**parsed_data["admin_contact"])
            if parsed_data.get("admin_contact")
            else None
        )
        tech_c = (
            ContactInfo(**parsed_data["tech_contact"])
            if parsed_data.get("tech_contact")
            else None
        )
        billing_c = (
            ContactInfo(**parsed_data["billing_contact"])
            if parsed_data.get("billing_contact")
            else None
        )

        result = WhoisScanResult(
            module_id="whois",
            status="completed",
            target=domain,
            domain=parsed_data.get("domain") or domain,
            registrar=parsed_data.get("registrar"),
            registrar_iana_id=parsed_data.get("registrar_iana_id"),
            whois_server=parsed_data.get("whois_server"),
            referral_url=parsed_data.get("referral_url"),
            creation_date=parsed_data.get("creation_date"),
            updated_date=parsed_data.get("updated_date"),
            expiration_date=parsed_data.get("expiration_date"),
            registry_expiry=parsed_data.get("registry_expiry"),
            domain_age_days=age_days,
            days_until_expiration=expiry_days,
            registrant_country=parsed_data.get("registrant_country"),
            registrant_organization=parsed_data.get("registrant_organization"),
            registrant_state=parsed_data.get("registrant_state"),
            registrant_city=parsed_data.get("registrant_city"),
            registrant_email=parsed_data.get("registrant_email"),
            registrant_phone=parsed_data.get("registrant_phone"),
            admin_contact=admin_c,
            tech_contact=tech_c,
            billing_contact=billing_c,
            domain_status=parsed_data.get("domain_status", []),
            name_servers=parsed_data.get("name_servers", []),
            dnssec=parsed_data.get("dnssec", "unsigned"),
            abuse_contact_email=parsed_data.get("abuse_contact_email"),
            abuse_contact_phone=parsed_data.get("abuse_contact_phone"),
            last_whois_update=parsed_data.get("last_whois_update"),
            raw_whois=raw_text,
            whois_score=score,
            risk_level=risk_level,
            security_observations=observations,
        )

        return result.model_dump()

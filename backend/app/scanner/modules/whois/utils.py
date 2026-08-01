"""
Phase 3.2.2 — Enterprise WHOIS Intelligence Module Utilities.

Includes:
- Domain sanitisation & validation.
- Raw WHOIS response parsing (multi-key extraction & normalization).
- Date parsing & age/expiry calculation.
- Enterprise security observation derivation.
- Weighted WHOIS trust/risk score calculation.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.scanner.modules.whois.whois_models import ContactInfo, WhoisObservation


def sanitise_domain(target: str) -> str:
    """Strip protocol, path, port, whitespace, and convert to lowercase."""
    d = target.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = re.sub(r"/.*$", "", d)
    d = re.sub(r":\d+$", "", d)
    return d.rstrip(".")


def validate_domain(domain: str) -> Tuple[bool, str]:
    """Validate domain syntax."""
    if not domain:
        return False, "Target domain string is empty."
    if len(domain) > 253:
        return False, "Domain length exceeds 253 characters limit."
    pattern = r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$"
    if not re.match(pattern, domain, re.IGNORECASE):
        return False, "Format does not match a valid FQDN."
    return True, ""


def parse_date_string(date_str: Optional[str]) -> Optional[datetime]:
    """Safely parse various WHOIS date string formats into datetime (UTC)."""
    if not date_str or not isinstance(date_str, str):
        return None

    clean_str = date_str.strip()
    if clean_str.lower() in ("null", "none", "", "n/a", "not specified"):
        return None

    # Try common ISO and WHOIS formats
    formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%d-%b-%Y",
        "%d-%b-%Y %H:%M:%S",
        "%Y.%m.%d",
        "%Y/%m/%d",
    ]

    # Clean ISO sub-seconds if present (e.g. 2024-05-15T12:00:00.123456Z)
    clean_str = re.sub(r"(\.\d+)", "", clean_str)

    for fmt in formats:
        try:
            dt = datetime.strptime(clean_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    return None


def calculate_domain_age(
    creation_date_str: Optional[str],
    expiration_date_str: Optional[str],
) -> Tuple[Optional[int], Optional[int]]:
    """Return (domain_age_days, days_until_expiration)."""
    now = datetime.now(timezone.utc)

    creation_dt = parse_date_string(creation_date_str)
    expiration_dt = parse_date_string(expiration_date_str)

    age_days: Optional[int] = None
    if creation_dt:
        age_days = max(0, (now - creation_dt).days)

    expiry_days: Optional[int] = None
    if expiration_dt:
        expiry_days = (expiration_dt - now).days

    return age_days, expiry_days


def _extract_first_match(patterns: List[str], text: str) -> Optional[str]:
    """Helper to try multiple regex patterns and return the first matched value."""
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if m:
            val = m.group(1).strip()
            if val and val.lower() not in ("none", "null", "n/a", "not specified"):
                return val
    return None


def _extract_all_matches(patterns: List[str], text: str) -> List[str]:
    """Helper to collect all matching values for repeated keys like Domain Status & Nameservers."""
    results: List[str] = []
    seen = set()
    for pattern in patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
            val = m.group(1).strip()
            if val and val.lower() not in seen:
                # Remove status codes like (https://icann.org/epp#...)
                clean_val = re.sub(r"\s+https?://\S+", "", val).strip()
                if clean_val:
                    seen.add(clean_val.lower())
                    results.append(clean_val)
    return results


def parse_whois_text(raw_text: str, domain: str) -> Dict[str, Any]:
    """
    Parse raw WHOIS text into standard normalized dictionary.
    Supports Verisign, PIR (.org), Nominet (.uk), ICANN standard output.
    """
    data: Dict[str, Any] = {
        "domain": domain,
        "registrar": None,
        "registrar_iana_id": None,
        "whois_server": None,
        "referral_url": None,
        "creation_date": None,
        "updated_date": None,
        "expiration_date": None,
        "registry_expiry": None,
        "registrant_country": None,
        "registrant_organization": None,
        "registrant_state": None,
        "registrant_city": None,
        "registrant_email": None,
        "registrant_phone": None,
        "admin_contact": None,
        "tech_contact": None,
        "billing_contact": None,
        "domain_status": [],
        "name_servers": [],
        "dnssec": "unsigned",
        "abuse_contact_email": None,
        "abuse_contact_phone": None,
        "last_whois_update": None,
    }

    if not raw_text:
        return data

    # Registrar
    data["registrar"] = _extract_first_match(
        [
            r"^\s*Registrar:\s*(.+)$",
            r"^\s*Sponsoring Registrar:\s*(.+)$",
            r"^\s*Registrar Name:\s*(.+)$",
        ],
        raw_text,
    )

    # Registrar IANA ID
    data["registrar_iana_id"] = _extract_first_match(
        [
            r"^\s*Registrar IANA ID:\s*(\d+)$",
            r"^\s*Sponsoring Registrar IANA ID:\s*(\d+)$",
        ],
        raw_text,
    )

    # WHOIS Server
    data["whois_server"] = _extract_first_match(
        [
            r"^\s*Registrar WHOIS Server:\s*(.+)$",
            r"^\s*WHOIS Server:\s*(.+)$",
            r"^\s*whois:\s*(.+)$",
        ],
        raw_text,
    )

    # Referral URL
    data["referral_url"] = _extract_first_match(
        [
            r"^\s*Registrar URL:\s*(.+)$",
            r"^\s*URL:\s*(.+)$",
        ],
        raw_text,
    )

    # Creation Date
    data["creation_date"] = _extract_first_match(
        [
            r"^\s*Creation Date:\s*(.+)$",
            r"^\s*Created On:\s*(.+)$",
            r"^\s*Registration Time:\s*(.+)$",
            r"^\s*Registered Date:\s*(.+)$",
        ],
        raw_text,
    )

    # Updated Date
    data["updated_date"] = _extract_first_match(
        [
            r"^\s*Updated Date:\s*(.+)$",
            r"^\s*Last Updated On:\s*(.+)$",
            r"^\s*Last Modified:\s*(.+)$",
        ],
        raw_text,
    )

    # Expiration Date & Registry Expiry
    expiry = _extract_first_match(
        [
            r"^\s*Registry Expiry Date:\s*(.+)$",
            r"^\s*Registrar Registration Expiration Date:\s*(.+)$",
            r"^\s*Expiration Date:\s*(.+)$",
            r"^\s*Expires On:\s*(.+)$",
        ],
        raw_text,
    )
    data["expiration_date"] = expiry
    data["registry_expiry"] = expiry

    # Registrant Info
    data["registrant_organization"] = _extract_first_match(
        [
            r"^\s*Registrant Organization:\s*(.+)$",
            r"^\s*Registrant Org:\s*(.+)$",
        ],
        raw_text,
    )
    data["registrant_country"] = _extract_first_match(
        [
            r"^\s*Registrant Country:\s*(.+)$",
        ],
        raw_text,
    )
    data["registrant_state"] = _extract_first_match(
        [
            r"^\s*Registrant State/Province:\s*(.+)$",
        ],
        raw_text,
    )
    data["registrant_city"] = _extract_first_match(
        [
            r"^\s*Registrant City:\s*(.+)$",
        ],
        raw_text,
    )
    data["registrant_email"] = _extract_first_match(
        [
            r"^\s*Registrant Email:\s*(.+)$",
        ],
        raw_text,
    )
    data["registrant_phone"] = _extract_first_match(
        [
            r"^\s*Registrant Phone:\s*(.+)$",
        ],
        raw_text,
    )

    # Admin Contact
    admin_org = _extract_first_match([r"^\s*Admin Organization:\s*(.+)$"], raw_text)
    admin_email = _extract_first_match([r"^\s*Admin Email:\s*(.+)$"], raw_text)
    admin_name = _extract_first_match([r"^\s*Admin Name:\s*(.+)$"], raw_text)
    if admin_name or admin_org or admin_email:
        data["admin_contact"] = {
            "name": admin_name,
            "organization": admin_org,
            "email": admin_email,
        }

    # Tech Contact
    tech_org = _extract_first_match([r"^\s*Tech Organization:\s*(.+)$"], raw_text)
    tech_email = _extract_first_match([r"^\s*Tech Email:\s*(.+)$"], raw_text)
    tech_name = _extract_first_match([r"^\s*Tech Name:\s*(.+)$"], raw_text)
    if tech_name or tech_org or tech_email:
        data["tech_contact"] = {
            "name": tech_name,
            "organization": tech_org,
            "email": tech_email,
        }

    # Billing Contact
    billing_org = _extract_first_match([r"^\s*Billing Organization:\s*(.+)$"], raw_text)
    billing_email = _extract_first_match([r"^\s*Billing Email:\s*(.+)$"], raw_text)
    billing_name = _extract_first_match([r"^\s*Billing Name:\s*(.+)$"], raw_text)
    if billing_name or billing_org or billing_email:
        data["billing_contact"] = {
            "name": billing_name,
            "organization": billing_org,
            "email": billing_email,
        }

    # Domain Statuses
    statuses = _extract_all_matches(
        [
            r"^\s*Domain Status:\s*(.+)$",
            r"^\s*Status:\s*(.+)$",
        ],
        raw_text,
    )
    data["domain_status"] = statuses

    # Name Servers
    ns_list = _extract_all_matches(
        [
            r"^\s*Name Server:\s*(.+)$",
            r"^\s*nserver:\s*(.+)$",
            r"^\s*Nameservers:\s*(.+)$",
        ],
        raw_text,
    )
    # Clean nameserver trailing dots and convert to lowercase
    data["name_servers"] = [ns.rstrip(".").lower() for ns in ns_list]

    # DNSSEC
    dnssec = _extract_first_match(
        [
            r"^\s*DNSSEC:\s*(.+)$",
            r"^\s*dnssec:\s*(.+)$",
        ],
        raw_text,
    )
    data["dnssec"] = dnssec if dnssec else "unsigned"

    # Abuse Contacts
    data["abuse_contact_email"] = _extract_first_match(
        [
            r"^\s*Registrar Abuse Contact Email:\s*(.+)$",
        ],
        raw_text,
    )
    data["abuse_contact_phone"] = _extract_first_match(
        [
            r"^\s*Registrar Abuse Contact Phone:\s*(.+)$",
        ],
        raw_text,
    )

    # Last WHOIS Update
    data["last_whois_update"] = _extract_first_match(
        [
            r"^\s*>>> Last update of WHOIS database:\s*(.+) <<<",
            r"^\s*Last update of whois database:\s*(.+)$",
        ],
        raw_text,
    )

    return data


def derive_whois_observations(whois_data: Dict[str, Any]) -> List[WhoisObservation]:
    """Derive enterprise security observations from WHOIS metadata."""
    obs: List[WhoisObservation] = []

    creation_date = whois_data.get("creation_date")
    expiration_date = whois_data.get("expiration_date")
    dnssec = (whois_data.get("dnssec") or "").lower()
    domain_statuses = whois_data.get("domain_status", [])
    reg_org = whois_data.get("registrant_organization") or ""

    age_days, expiry_days = calculate_domain_age(creation_date, expiration_date)

    # Domain Age Observations
    if age_days is not None:
        if age_days < 7:
            obs.append(
                WhoisObservation(
                    title="Domain Registered < 7 Days Ago",
                    description=f"Domain was registered {age_days} day(s) ago. Extremely new domains carry high impersonation and phishing risks.",
                    severity="HIGH",
                    recommendation="Perform strict identity verification before allowing high-trust actions.",
                )
            )
        elif age_days < 30:
            obs.append(
                WhoisObservation(
                    title="Recently Registered Domain (< 30 Days)",
                    description=f"Domain was registered {age_days} day(s) ago. Recently registered domains are statistically subject to higher risk.",
                    severity="MEDIUM",
                    recommendation="Monitor initial domain activities and verify SSL/TLS identity credentials.",
                )
            )
        elif age_days > 3650:
            obs.append(
                WhoisObservation(
                    title="Long-Lived Established Domain (> 10 Years)",
                    description=f"Domain has been active for {round(age_days / 365, 1)} years ({age_days} days). Indicates mature brand infrastructure.",
                    severity="INFO",
                    recommendation="Maintain existing registrar renewal schedules.",
                )
            )
    else:
        obs.append(
            WhoisObservation(
                title="Missing Domain Creation Date",
                description="The WHOIS record does not contain an explicit creation timestamp.",
                severity="LOW",
                recommendation="Check secondary WHOIS or TLD registry databases for registration history.",
            )
        )

    # Expiration Proximity Observations
    if expiry_days is not None:
        if expiry_days < 0:
            obs.append(
                WhoisObservation(
                    title="Domain Expired",
                    description=f"Domain registration expired {abs(expiry_days)} day(s) ago.",
                    severity="HIGH",
                    recommendation="Renew domain immediately to prevent registry deletion or domain squatting takeover.",
                )
            )
        elif expiry_days < 30:
            obs.append(
                WhoisObservation(
                    title="Domain Expires Soon (< 30 Days Remaining)",
                    description=f"Domain registration expires in {expiry_days} day(s).",
                    severity="MEDIUM",
                    recommendation="Renew registration promptly to prevent service disruption or hijacking.",
                )
            )

    # DNSSEC Observation
    if dnssec in ("unsigned", "no", "disabled", "false", ""):
        obs.append(
            WhoisObservation(
                title="No DNSSEC Enabled",
                description="DNSSEC is unsigned or unconfigured for this domain.",
                severity="INFO",
                recommendation="Enable DNSSEC at your registrar to protect against DNS spoofing and cache poisoning.",
            )
        )
    elif "signed" in dnssec or "yes" in dnssec:
        obs.append(
            WhoisObservation(
                title="DNSSEC Enabled",
                description="Domain is protected with active DNSSEC signature delegation.",
                severity="INFO",
                recommendation="Ensure DNSSEC cryptographic keys are rotated periodically.",
            )
        )

    # Privacy Protection Observation
    privacy_keywords = ["redacted", "privacy", "withheld", "statutory", "select", "whoisguard", "protect"]
    if any(k in reg_org.lower() for k in privacy_keywords):
        obs.append(
            WhoisObservation(
                title="Privacy Protection Enabled",
                description="Registrant personal details are shielded by WHOIS privacy protection service.",
                severity="INFO",
                recommendation="Standard privacy shielding active in compliance with GDPR/ICANN regulations.",
            )
        )

    # Suspicious Domain Statuses
    suspicious_flags = ["clienthold", "serverhold", "redemptionperiod", "pendingdelete"]
    flagged_statuses = [s for s in domain_statuses if any(f in s.lower() for f in suspicious_flags)]
    if flagged_statuses:
        obs.append(
            WhoisObservation(
                title="Domain Status Hold / Restrict Flagged",
                description=f"Domain status contains restrictive registry flags: {', '.join(flagged_statuses)}.",
                severity="HIGH",
                recommendation="Investigate registrar hold status; DNS resolution or domain transfers may be suspended.",
            )
        )

    # Missing Registrar Observation
    if not whois_data.get("registrar"):
        obs.append(
            WhoisObservation(
                title="Registrar Information Unavailable",
                description="WHOIS server did not return explicit sponsoring registrar details.",
                severity="LOW",
                recommendation="Query the top-level domain registry server directly for full registration data.",
            )
        )

    return obs


def calculate_whois_risk_score(
    whois_data: Dict[str, Any],
    observations: List[WhoisObservation],
) -> Tuple[int, str]:
    """
    Calculate weighted WHOIS trust/confidence score (0-100) and risk level ("LOW" | "MEDIUM" | "HIGH").
    """
    score = 80  # Base trust score

    creation_date = whois_data.get("creation_date")
    expiration_date = whois_data.get("expiration_date")
    dnssec = (whois_data.get("dnssec") or "").lower()
    statuses = whois_data.get("domain_status", [])

    age_days, expiry_days = calculate_domain_age(creation_date, expiration_date)

    # Domain Age adjustments
    if age_days is not None:
        if age_days > 3650:  # > 10 years
            score += 15
        elif age_days > 1095:  # > 3 years
            score += 5
        elif age_days < 7:
            score -= 35
        elif age_days < 30:
            score -= 25

    # Expiration adjustments
    if expiry_days is not None:
        if expiry_days < 0:
            score -= 45
        elif expiry_days < 30:
            score -= 20

    # DNSSEC bonus
    if "signed" in dnssec or "yes" in dnssec:
        score += 10

    # Hold status penalties
    if any("hold" in s.lower() or "delete" in s.lower() for s in statuses):
        score -= 30

    # Clamp score to [0, 100]
    score = max(0, min(100, score))

    if score >= 80:
        risk_level = "LOW"
    elif score >= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return score, risk_level

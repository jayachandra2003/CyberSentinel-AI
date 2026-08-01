"""
Phase 3.2.2 — Enterprise WHOIS Intelligence Module.

Retrieve publicly available WHOIS registration information, compute domain age,
derive enterprise security observations, and calculate WHOIS risk score.
"""
from app.scanner.modules.whois.whois_models import (
    ContactInfo,
    WhoisObservation,
    WhoisScanResult,
)
from app.scanner.modules.whois.whois_scanner import WHOISScanner

__all__ = [
    "WHOISScanner",
    "WhoisScanResult",
    "WhoisObservation",
    "ContactInfo",
]

"""
DNS Security Assessment Module — Phase 3.2.1.

Performs live DNS lookups (A, AAAA, MX, NS, TXT, CNAME) for a target domain
using the dnspython library.  Implements IScannerModule so it plugs directly
into the ScanOrchestrator via register_module().

Public surface:
    DNSScanner    — the scanner class
    DnsScanResult — the Pydantic result model (for typing in callers)
"""
from app.scanner.modules.dns.dns_scanner import DNSScanner
from app.scanner.modules.dns.dns_models import DnsScanResult, DnsRecordType, DnsLookupStatus

__all__ = ["DNSScanner", "DnsScanResult", "DnsRecordType", "DnsLookupStatus"]

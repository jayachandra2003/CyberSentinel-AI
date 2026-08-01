"""
DNS Record Data Models for Phase 3.2.1 Defensive DNS Assessment.

Each model represents a structured result for a specific DNS record type.
All models use Pydantic for runtime validation and clean JSON serialisation.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DnsRecordType(str, Enum):
    A = "A"
    AAAA = "AAAA"
    MX = "MX"
    NS = "NS"
    TXT = "TXT"
    CNAME = "CNAME"


class DnsLookupStatus(str, Enum):
    OK = "ok"
    NXDOMAIN = "nxdomain"
    NO_ANSWER = "no_answer"
    TIMEOUT = "timeout"
    ERROR = "error"


# ---------------------------------------------------------------------------
# Per-record-type models
# ---------------------------------------------------------------------------

class ARecord(BaseModel):
    address: str = Field(..., description="IPv4 address")
    ttl: int = Field(..., description="Time-to-live in seconds")


class AAAARecord(BaseModel):
    address: str = Field(..., description="IPv6 address")
    ttl: int = Field(..., description="Time-to-live in seconds")


class MXRecord(BaseModel):
    preference: int = Field(..., description="MX record priority (lower = higher priority)")
    exchange: str = Field(..., description="Fully-qualified mail exchange hostname")
    ttl: int = Field(..., description="Time-to-live in seconds")


class NSRecord(BaseModel):
    nameserver: str = Field(..., description="Authoritative nameserver hostname")
    ttl: int = Field(..., description="Time-to-live in seconds")


class TXTRecord(BaseModel):
    values: List[str] = Field(..., description="Decoded TXT record string values")
    ttl: int = Field(..., description="Time-to-live in seconds")


class CNAMERecord(BaseModel):
    target: str = Field(..., description="CNAME canonical target")
    ttl: int = Field(..., description="Time-to-live in seconds")


# ---------------------------------------------------------------------------
# Per-record-type lookup result wrapper
# ---------------------------------------------------------------------------

class DnsRecordResult(BaseModel):
    record_type: DnsRecordType
    status: DnsLookupStatus
    records: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    query_time_ms: Optional[float] = None


# ---------------------------------------------------------------------------
# Aggregate output produced by DNSScanner.run()
# ---------------------------------------------------------------------------

class DnsScanResult(BaseModel):
    module_id: str = "dns"
    status: str = "completed"
    target: str
    results: Dict[str, DnsRecordResult] = Field(default_factory=dict)
    # Summary counts derived after all lookups complete
    total_records_found: int = 0
    failed_lookups: List[str] = Field(default_factory=list)
    security_observations: List[str] = Field(default_factory=list)

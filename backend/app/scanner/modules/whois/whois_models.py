"""
Phase 3.2.2 — Enterprise WHOIS Intelligence Module Models.
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class WhoisObservation(BaseModel):
    title: str
    description: str
    severity: str  # "INFO" | "LOW" | "MEDIUM" | "HIGH"
    recommendation: str


class WhoisScanResult(BaseModel):
    module_id: str = "whois"
    status: str = "completed"  # "completed" | "failed" | "error"
    target: str
    domain: Optional[str] = None
    registrar: Optional[str] = None
    registrar_iana_id: Optional[str] = None
    whois_server: Optional[str] = None
    referral_url: Optional[str] = None
    creation_date: Optional[str] = None
    updated_date: Optional[str] = None
    expiration_date: Optional[str] = None
    registry_expiry: Optional[str] = None
    domain_age_days: Optional[int] = None
    days_until_expiration: Optional[int] = None
    registrant_country: Optional[str] = None
    registrant_organization: Optional[str] = None
    registrant_state: Optional[str] = None
    registrant_city: Optional[str] = None
    registrant_email: Optional[str] = None
    registrant_phone: Optional[str] = None
    admin_contact: Optional[ContactInfo] = None
    tech_contact: Optional[ContactInfo] = None
    billing_contact: Optional[ContactInfo] = None
    domain_status: List[str] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    dnssec: Optional[str] = "unsigned"
    abuse_contact_email: Optional[str] = None
    abuse_contact_phone: Optional[str] = None
    last_whois_update: Optional[str] = None
    raw_whois: Optional[str] = None
    whois_score: int = 80
    risk_level: str = "LOW"  # "LOW" | "MEDIUM" | "HIGH"
    security_observations: List[WhoisObservation] = Field(default_factory=list)

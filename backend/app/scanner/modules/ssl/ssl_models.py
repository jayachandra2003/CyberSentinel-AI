from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SslStatusEnum(str, Enum):
    COMPLETED = "completed"
    ERROR = "error"
    FAILED = "failed"


class RiskLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SslObservation(BaseModel):
    code: str
    severity: RiskLevelEnum
    title: str
    description: str


class SslCertificateInfo(BaseModel):
    subject_cn: Optional[str] = None
    issuer_cn: Optional[str] = None
    issuer_organization: Optional[str] = None
    serial_number: Optional[str] = None
    version: Optional[int] = None
    signature_algorithm: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    days_until_expiration: Optional[int] = None
    is_expired: bool = False
    is_self_signed: bool = False
    subject_alternative_names: List[str] = Field(default_factory=list)


class SslProtocolInfo(BaseModel):
    protocol_version: Optional[str] = None
    cipher_name: Optional[str] = None
    cipher_version: Optional[str] = None
    cipher_bits: Optional[int] = None
    handshake_time_ms: Optional[float] = None


class SslScanResult(BaseModel):
    module_id: str = "ssl"
    status: str = "completed"
    target: str
    is_valid: bool = False
    error_message: Optional[str] = None
    certificate: Optional[SslCertificateInfo] = None
    protocol: Optional[SslProtocolInfo] = None
    risk_score: int = 0
    risk_level: RiskLevelEnum = RiskLevelEnum.LOW
    security_observations: List[SslObservation] = Field(default_factory=list)

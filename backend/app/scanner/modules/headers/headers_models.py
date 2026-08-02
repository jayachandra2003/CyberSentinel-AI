from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HeaderStatusEnum(str, Enum):
    CONFIGURED = "configured"
    MISSING = "missing"
    WEAK = "weak"
    INFO = "info"
    REPORT_ONLY = "report_only"


class RiskLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class HeadersObservation(BaseModel):
    code: str
    severity: RiskLevelEnum
    title: str
    description: str


class HeaderAnalysisItem(BaseModel):
    header_name: str
    header_value: Optional[str] = None
    status: HeaderStatusEnum
    severity: RiskLevelEnum
    title: str
    description: str
    recommendation: str


class HeadersScanResult(BaseModel):
    module_id: str = "headers"
    status: str = "completed"
    target: str
    effective_url: Optional[str] = None
    status_code: Optional[int] = None
    headers_count: int = 0
    risk_score: int = 0
    risk_level: RiskLevelEnum = RiskLevelEnum.LOW
    analyzed_headers: List[HeaderAnalysisItem] = Field(default_factory=list)
    raw_headers: Dict[str, str] = Field(default_factory=dict)
    security_observations: List[HeadersObservation] = Field(default_factory=list)

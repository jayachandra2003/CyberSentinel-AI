from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CookieStatusEnum(str, Enum):
    CONFIGURED = "configured"
    MISSING = "missing"
    WEAK = "weak"
    INFO = "info"


class RiskLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CookieObservation(BaseModel):
    code: str
    severity: RiskLevelEnum
    title: str
    description: str


class ScoreBreakdownItem(BaseModel):
    label: str
    points: int
    category: str


class CookieAnalysisItem(BaseModel):
    name: str
    value: Optional[str] = None
    domain: Optional[str] = None
    path: Optional[str] = None
    is_secure: bool = False
    is_httponly: bool = False
    samesite: Optional[str] = None
    is_host_prefix: bool = False
    is_secure_prefix: bool = False
    is_partitioned: bool = False
    max_age: Optional[int] = None
    expires: Optional[str] = None
    category: str = "unknown"
    category_label: str = "Unknown"
    weight: float = 0.5
    finding_id: Optional[str] = None
    status: CookieStatusEnum = CookieStatusEnum.CONFIGURED
    severity: RiskLevelEnum = RiskLevelEnum.LOW
    title: str
    description: str
    recommendation: str


class CookieScanResult(BaseModel):
    module_id: str = "cookies"
    status: str = "completed"
    target: str
    effective_url: Optional[str] = None
    cookies_count: int = 0
    risk_score: int = 0
    risk_level: RiskLevelEnum = RiskLevelEnum.LOW
    analyzed_cookies: List[CookieAnalysisItem] = Field(default_factory=list)
    raw_cookies: List[Dict[str, Any]] = Field(default_factory=list)
    security_observations: List[CookieObservation] = Field(default_factory=list)
    score_breakdown: List[ScoreBreakdownItem] = Field(default_factory=list)

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class TechCategoryEnum(str, Enum):
    SERVER = "server"
    FRAMEWORK = "framework"
    CMS = "cms"
    CDN = "cdn"
    WAF = "waf"
    ANALYTICS = "analytics"
    SECURITY = "security"
    UNKNOWN = "unknown"


class RiskLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TechObservation(BaseModel):
    code: str
    severity: RiskLevelEnum
    title: str
    description: str


class DetectedTechnology(BaseModel):
    name: str
    category: TechCategoryEnum
    category_label: str
    version: Optional[str] = None
    confidence: int  # 0 to 100
    evidence: str  # e.g., "Server: nginx/1.18.0"
    description: str


class TechScanResult(BaseModel):
    module_id: str = "tech"
    status: str = "completed"
    target: str
    effective_url: Optional[str] = None
    tech_count: int = 0
    risk_score: int = 0
    risk_level: RiskLevelEnum = RiskLevelEnum.LOW
    detected_technologies: List[DetectedTechnology] = Field(default_factory=list)
    security_observations: List[TechObservation] = Field(default_factory=list)

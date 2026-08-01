from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.scan import ScanStatusEnum


class ScanTargetCreate(BaseModel):
    target_url: str


class ScanTargetResponse(BaseModel):
    id: int
    user_id: int
    target_url: str
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ScanCreate(BaseModel):
    target_domain: str = Field(..., example="example.com")
    scan_type: str = Field("Quick Scan", example="Quick Scan")


class ScanResponse(BaseModel):
    id: int
    user_id: int
    target_domain: str
    scan_type: str
    status: ScanStatusEnum
    progress: int = 0
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = 0.0
    summary: Optional[str] = None

    class Config:
        from_attributes = True

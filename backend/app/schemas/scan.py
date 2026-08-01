"""
Scan Pydantic schemas — Phase 3.2.1 update exposes module_results.

ScanResponse now includes a module_results field so that completed scans
surface live DNS records (and, in future phases, SSL/WHOIS/headers) through
the REST API.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
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
    # Module results dict: keys are module IDs ("dns", "ssl", …),
    # values are the full result payloads returned by each IScannerModule.
    module_results: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj: Any, **kwargs: Any) -> "ScanResponse":  # type: ignore[override]
        """
        Override model_validate to pull module_results from the ORM property
        rather than directly from a mapped column.  SQLAlchemy does not expose
        the @property as a mapped attribute during Pydantic's from_attributes
        traversal, so we extract it explicitly here.
        """
        # Let Pydantic do its normal from_attributes pass first
        instance = super().model_validate(obj, **kwargs)
        # Then layer in the Python property value (which decodes the JSON)
        if hasattr(obj, "module_results"):
            try:
                instance.module_results = obj.module_results or {}
            except Exception:
                instance.module_results = {}
        return instance

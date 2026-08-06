"""
Enterprise Scan Engine Schemas — Phase 7 Milestone 2.

Defines Pydantic request and response models for single, batch, queue status, and cancellation API contracts.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SingleScanRequest(BaseModel):
    target: Optional[str] = Field(None, example="example.com")
    target_domain: Optional[str] = Field(None, example="example.com")
    profile: Optional[str] = Field("Standard Scan", example="Standard Scan")
    scan_type: Optional[str] = Field("Standard Scan", example="Standard Scan")


class SingleScanResponse(BaseModel):
    scan_id: int
    target: str
    status: str
    current_state: str
    profile: str
    created_at: Optional[datetime] = None


class BatchScanRequest(BaseModel):
    targets: List[str] = Field(..., example=["example.com", "github.com", "cloudflare.com"])
    profile: str = Field("Standard Scan", example="Standard Scan")


class BatchScanResponse(BaseModel):
    batch_id: str
    total_jobs: int
    queued_jobs: int
    scan_ids: List[int]
    failed_targets: List[Dict[str, str]] = Field(default_factory=list)


class EngineQueueStatusResponse(BaseModel):
    queue_length: int
    running_scans: int
    active_workers: int
    max_workers: int
    queued_jobs: List[Dict[str, Any]] = Field(default_factory=list)


class CancelScanResponse(BaseModel):
    scan_id: int
    status: str
    current_state: str
    message: str


class EngineScanDetailsResponse(BaseModel):
    scan_id: int
    target_domain: str
    status: str
    current_state: str
    progress: int
    profile: str
    module_status: Dict[str, str] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = 0.0
    summary: Optional[str] = None

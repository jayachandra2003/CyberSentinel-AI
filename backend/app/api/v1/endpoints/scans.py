"""
Scans Endpoints — Enterprise Scan Engine REST APIs (Phase 7 Milestone 2).

Exposes single scan submission, batch submission, engine queue status, scan details, and scan cancellation.
"""
from __future__ import annotations

from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.scan_repository import ScanRepository
from app.schemas.common import ApiResponse
from app.schemas.scan import ScanResponse
from app.schemas.scan_engine import (
    BatchScanRequest,
    BatchScanResponse,
    CancelScanResponse,
    EngineQueueStatusResponse,
    EngineScanDetailsResponse,
    SingleScanRequest,
    SingleScanResponse,
)
from app.services.engine_service import engine_service

router = APIRouter()


@router.post("/", response_model=ApiResponse[SingleScanResponse], status_code=status.HTTP_201_CREATED)
async def create_single_scan(
    payload: SingleScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a single target scan job to the Enterprise Scan Engine.
    """
    target = payload.target or payload.target_domain
    if not target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target domain must be provided via 'target' or 'target_domain'.",
        )

    profile = payload.profile or payload.scan_type or "Standard Scan"
    result = await engine_service.submit_single_scan(
        user_id=current_user.id,
        target_raw=target,
        profile=profile,
        db=db,
    )
    return ApiResponse(success=True, data=result)


@router.post("/batch", response_model=ApiResponse[BatchScanResponse], status_code=status.HTTP_201_CREATED)
async def create_batch_scans(
    payload: BatchScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit multiple target scan jobs in a single batch to the Enterprise Scan Engine.
    """
    result = await engine_service.submit_batch_scans(
        user_id=current_user.id,
        targets=payload.targets,
        profile=payload.profile,
        db=db,
    )
    return ApiResponse(success=True, data=result)


@router.get("/queue/status", response_model=ApiResponse[EngineQueueStatusResponse])
async def get_queue_status(
    current_user: User = Depends(get_current_user),
):
    """
    Inspect Enterprise Scan Engine queue status, active workers, and running scans count.
    """
    result = engine_service.get_queue_status()
    return ApiResponse(success=True, data=result)


@router.get("/", response_model=ApiResponse[List[ScanResponse]])
async def list_user_scans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all scans for the current authenticated user (backwards compatible).
    """
    scan_repo = ScanRepository(db)
    scans = await scan_repo.get_user_scans(user_id=current_user.id)
    return ApiResponse(
        success=True,
        data=[ScanResponse.model_validate(s) for s in scans],
    )


@router.get("/{scan_id}", response_model=ApiResponse[EngineScanDetailsResponse])
async def get_scan_details(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve detailed scan status, module execution progress, and timestamps.
    """
    result = await engine_service.get_scan_details(scan_id=scan_id, db=db)
    return ApiResponse(success=True, data=result)


@router.post("/{scan_id}/cancel", response_model=ApiResponse[CancelScanResponse])
async def cancel_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a queued or running scan job.
    """
    result = await engine_service.cancel_scan(scan_id=scan_id, db=db)
    return ApiResponse(success=True, data=result)


@router.delete("/{scan_id}", response_model=ApiResponse[dict])
async def delete_scan(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a scan record by ID (backwards compatible).
    """
    scan_repo = ScanRepository(db)
    scan = await scan_repo.get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan record not found.",
        )
    await scan_repo.delete_scan(scan_id)
    return ApiResponse(
        success=True,
        data={"message": f"Scan {scan_id} deleted successfully."},
    )

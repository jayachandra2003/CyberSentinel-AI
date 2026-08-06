"""
Unit tests for Phase 7 Duplicate Scan Prevention in EngineService.

Tests:
- duplicate QUEUED scan (raises 409 Conflict)
- duplicate RUNNING scan (raises 409 Conflict)
- COMPLETED scan can be recreated
- FAILED scan can be recreated
- CANCELLED scan can be recreated
- batch request containing duplicates
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.models.scan import ScanStatusEnum
from app.schemas.scan import ScanResponse
from app.services.engine_service import EngineService


class DummyScan:
    def __init__(self, scan_id: int, domain: str, status: ScanStatusEnum):
        self.id = scan_id
        self.target_domain = domain
        self.status = status
        self.scan_type = "Standard Scan"
        self.progress = 0
        self.created_at = None
        self.started_at = None
        self.completed_at = None
        self.duration = 0.0
        self.summary = ""
        self.module_results = {}


@pytest.mark.asyncio
async def test_duplicate_queued_scan_prevention():
    """Verify that submitting a duplicate QUEUED target raises HTTP 409."""
    engine = EngineService()
    mock_db = AsyncMock()
    mock_repo = MagicMock()
    mock_repo.get_user_scans = AsyncMock(return_value=[DummyScan(1, "example.com", ScanStatusEnum.QUEUED)])
    
    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.services.engine_service.ScanRepository", lambda db: mock_repo)
        with pytest.raises(HTTPException) as exc_info:
            await engine.submit_single_scan(user_id=1, target_raw="example.com", profile="Standard Scan", db=mock_db)
        assert exc_info.value.status_code == 409
        assert "already queued or running" in exc_info.value.detail


@pytest.mark.asyncio
async def test_duplicate_running_scan_prevention():
    """Verify that submitting a duplicate RUNNING target raises HTTP 409."""
    engine = EngineService()
    mock_db = AsyncMock()
    mock_repo = MagicMock()
    mock_repo.get_user_scans = AsyncMock(return_value=[DummyScan(2, "example.com", ScanStatusEnum.RUNNING)])
    
    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.services.engine_service.ScanRepository", lambda db: mock_repo)
        with pytest.raises(HTTPException) as exc_info:
            await engine.submit_single_scan(user_id=1, target_raw="example.com", profile="Standard Scan", db=mock_db)
        assert exc_info.value.status_code == 409
        assert "already queued or running" in exc_info.value.detail


@pytest.mark.asyncio
async def test_completed_scan_can_be_recreated():
    """Verify that a target with status COMPLETED can be submitted again."""
    engine = EngineService()
    mock_db = AsyncMock()
    mock_repo = MagicMock()
    mock_repo.get_user_scans = AsyncMock(return_value=[DummyScan(3, "example.com", ScanStatusEnum.COMPLETED)])
    mock_repo.create_scan = AsyncMock(return_value=DummyScan(10, "example.com", ScanStatusEnum.QUEUED))

    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.services.engine_service.ScanRepository", lambda db: mock_repo)
        res = await engine.submit_single_scan(user_id=1, target_raw="example.com", profile="Standard Scan", db=mock_db)
        assert res.scan_id == 10
        assert res.target == "example.com"


@pytest.mark.asyncio
async def test_failed_scan_can_be_recreated():
    """Verify that a target with status FAILED can be submitted again."""
    engine = EngineService()
    mock_db = AsyncMock()
    mock_repo = MagicMock()
    mock_repo.get_user_scans = AsyncMock(return_value=[DummyScan(4, "example.com", ScanStatusEnum.FAILED)])
    mock_repo.create_scan = AsyncMock(return_value=DummyScan(11, "example.com", ScanStatusEnum.QUEUED))

    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.services.engine_service.ScanRepository", lambda db: mock_repo)
        res = await engine.submit_single_scan(user_id=1, target_raw="example.com", profile="Standard Scan", db=mock_db)
        assert res.scan_id == 11


@pytest.mark.asyncio
async def test_cancelled_scan_can_be_recreated():
    """Verify that a target with status CANCELLED can be submitted again."""
    engine = EngineService()
    mock_db = AsyncMock()
    mock_repo = MagicMock()
    mock_repo.get_user_scans = AsyncMock(return_value=[DummyScan(5, "example.com", ScanStatusEnum.CANCELLED)])
    mock_repo.create_scan = AsyncMock(return_value=DummyScan(12, "example.com", ScanStatusEnum.QUEUED))

    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.services.engine_service.ScanRepository", lambda db: mock_repo)
        res = await engine.submit_single_scan(user_id=1, target_raw="example.com", profile="Standard Scan", db=mock_db)
        assert res.scan_id == 12


@pytest.mark.asyncio
async def test_batch_submission_containing_duplicates():
    """Verify that batch submission skips active duplicate targets and reports failure details."""
    engine = EngineService()
    mock_db = AsyncMock()
    mock_repo = MagicMock()
    mock_repo.get_user_scans = AsyncMock(return_value=[DummyScan(1, "active.com", ScanStatusEnum.QUEUED)])
    mock_repo.create_scan = AsyncMock(return_value=DummyScan(20, "newtarget.com", ScanStatusEnum.QUEUED))

    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.services.engine_service.ScanRepository", lambda db: mock_repo)
        res = await engine.submit_batch_scans(
            user_id=1,
            targets=["active.com", "newtarget.com"],
            profile="Standard Scan",
            db=mock_db,
        )
        assert res.total_jobs == 2
        assert res.queued_jobs == 1
        assert res.scan_ids == [20]
        assert len(res.failed_targets) == 1
        assert res.failed_targets[0]["target"] == "active.com"

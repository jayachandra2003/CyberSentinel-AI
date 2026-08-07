"""
Unit tests for Phase 7 Milestone 4 Stage 1 Production Hardening:
- ScanStatusEnum CANCELLED fix
- QueueRecoveryEngine (stale RUNNING cleanup, QUEUED reloading, idempotency)
- Graceful Shutdown (accepting_jobs check, HTTP 503 response)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.models.scan import Scan, ScanStatusEnum
from app.scanner.engine.queue_manager import QueueManager, ScanJob
from app.scanner.engine.queue_recovery import QueueRecoveryEngine
from app.scanner.engine.worker_pool_manager import WorkerPoolManager
from app.services.engine_service import EngineService
from app.core.config import settings


def test_scan_status_enum_cancelled():
    """Verify that ScanStatusEnum contains CANCELLED with value 'Cancelled'."""
    assert hasattr(ScanStatusEnum, "CANCELLED")
    assert ScanStatusEnum.CANCELLED.value == "Cancelled"
    assert ScanStatusEnum.CANCELLED == "Cancelled"


@pytest.mark.asyncio
async def test_queue_recovery_stale_running_and_queued_scans():
    """Verify QueueRecoveryEngine updates stale RUNNING scans to FAILED and reloads QUEUED scans."""
    qm = QueueManager(max_size=10)
    mock_db = AsyncMock()

    stale_running_scan = Scan(id=1, target_domain="stale.com", status=ScanStatusEnum.RUNNING)
    pending_queued_scan = Scan(id=2, target_domain="queued.org", status=ScanStatusEnum.QUEUED, scan_type="Standard Scan")

    # Mock DB query results
    mock_result_running = MagicMock()
    mock_result_running.scalars.return_value.all.return_value = [stale_running_scan]

    mock_result_queued = MagicMock()
    mock_result_queued.scalars.return_value.all.return_value = [pending_queued_scan]

    mock_db.execute = AsyncMock(side_effect=[mock_result_running, mock_result_queued])
    mock_db.commit = AsyncMock()

    requeued, failed_running = await QueueRecoveryEngine.recover_on_startup(mock_db, qm)

    assert failed_running == 1
    assert requeued == 1
    assert stale_running_scan.status == ScanStatusEnum.FAILED
    assert "interrupted by server restart" in stale_running_scan.summary
    assert qm.size() == 1
    assert qm.get_job(2) is not None


@pytest.mark.asyncio
async def test_queue_recovery_idempotency():
    """Verify QueueRecoveryEngine does not re-enqueue job if already present in memory."""
    qm = QueueManager(max_size=10)
    mock_db = AsyncMock()

    # Pre-populate job 5 in memory
    job5 = ScanJob(job_id=5, target_domain="existing.com")
    await qm.enqueue(job5)

    pending_queued_scan = Scan(id=5, target_domain="existing.com", status=ScanStatusEnum.QUEUED)

    mock_result_running = MagicMock()
    mock_result_running.scalars.return_value.all.return_value = []

    mock_result_queued = MagicMock()
    mock_result_queued.scalars.return_value.all.return_value = [pending_queued_scan]

    mock_db.execute = AsyncMock(side_effect=[mock_result_running, mock_result_queued])
    mock_db.commit = AsyncMock()

    requeued, failed_running = await QueueRecoveryEngine.recover_on_startup(mock_db, qm)

    assert requeued == 0
    assert failed_running == 0
    assert qm.size() == 1


@pytest.mark.asyncio
async def test_graceful_shutdown_rejection():
    """Verify that EngineService rejects submissions with 503 during graceful shutdown."""
    engine = EngineService()
    mock_db = AsyncMock()

    await engine.shutdown()
    assert engine.worker_pool.accepting_jobs is False

    with pytest.raises(HTTPException) as exc_info:
        await engine.submit_single_scan(user_id=1, target_raw="example.com", profile="Standard Scan", db=mock_db)
    assert exc_info.value.status_code == 503
    assert "shutting down" in exc_info.value.detail

    with pytest.raises(HTTPException) as exc_info_batch:
        await engine.submit_batch_scans(user_id=1, targets=["example.com"], profile="Standard Scan", db=mock_db)
    assert exc_info_batch.value.status_code == 503

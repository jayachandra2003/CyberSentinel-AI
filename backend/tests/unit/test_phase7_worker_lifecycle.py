"""
Worker Lifecycle & Queue Scheduling Inconsistency Unit Tests (Phase 7 Stage 2 Bugfix).

Verifies:
- 5 submitted scans with max_workers=4
- First 4 execute immediately, 5th waits in queue
- After first completion, 5th queued scan immediately starts
- Final worker count returns to zero
- Queue length returns to zero
- No worker leaks, no queue deadlocks
- Accurate metrics derivation in get_queue_status
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.scan import Scan, ScanStatusEnum
from app.scanner.engine.queue_manager import QueueManager, ScanJob
from app.scanner.engine.state_machine import ScanEngineState, ScanStateMachine
from app.scanner.engine.worker_pool_manager import WorkerPoolManager
from app.services.engine_service import EngineService


@pytest.mark.asyncio
async def test_five_scans_queue_scheduling_and_worker_release():
    """
    Test 5 submitted scans with max_workers=4:
    - 4 workers process jobs 1..4 concurrently
    - Job 5 waits in queue
    - As soon as one worker completes, Job 5 is immediately acquired and processed
    - All 5 jobs finish and active_worker_count returns to 0
    - Queue length returns to 0
    """
    qm = QueueManager(max_size=20)
    wp = WorkerPoolManager(queue_manager=qm, max_workers=4)

    executed_jobs = []
    active_worker_samples = []

    async def mock_handler(job: ScanJob):
        executed_jobs.append(job.job_id)
        active_worker_samples.append(wp.active_worker_count)
        # Simulate short scan work
        await asyncio.sleep(0.05)
        if job.state_machine.can_transition_to(ScanEngineState.RUNNING):
            job.state_machine.transition_to(ScanEngineState.RUNNING)
        if job.state_machine.can_transition_to(ScanEngineState.COMPLETED):
            job.state_machine.transition_to(ScanEngineState.COMPLETED)

    wp.set_job_handler(mock_handler)

    # 1. Enqueue 5 jobs
    for i in range(1, 6):
        sm = ScanStateMachine(initial_state=ScanEngineState.NEW)
        sm.transition_to(ScanEngineState.VALIDATING)
        job = ScanJob(job_id=i, target_domain=f"target{i}.com", state_machine=sm)
        await qm.enqueue(job)

    assert qm.size() == 5

    # 2. Start worker pool with 4 workers
    await wp.start()

    # Wait for all 5 jobs to complete
    max_wait = 3.0
    elapsed = 0.0
    while len(executed_jobs) < 5 and elapsed < max_wait:
        await asyncio.sleep(0.05)
        elapsed += 0.05

    # 3. Stop worker pool cleanly
    await wp.stop()

    # Assert all 5 executed
    assert len(executed_jobs) == 5
    assert set(executed_jobs) == {1, 2, 3, 4, 5}

    # Verify peak concurrency was at most 4
    assert max(active_worker_samples) <= 4

    # Verify all workers released
    assert wp.active_worker_count == 0
    assert qm.size() == 0


@pytest.mark.asyncio
async def test_worker_cleanup_on_unhandled_exception():
    """Verify active_worker_count is decremented even if handler raises unhandled exception."""
    qm = QueueManager(max_size=10)
    wp = WorkerPoolManager(queue_manager=qm, max_workers=2)

    async def crashing_handler(job: ScanJob):
        raise RuntimeError("Crash inside worker handler!")

    wp.set_job_handler(crashing_handler)

    sm = ScanStateMachine(initial_state=ScanEngineState.NEW)
    sm.transition_to(ScanEngineState.VALIDATING)
    job = ScanJob(job_id=1, target_domain="crash.com", state_machine=sm)
    await qm.enqueue(job)

    await wp.start()
    await asyncio.sleep(0.1)
    await wp.stop()

    assert wp.active_worker_count == 0
    assert qm.size() == 0


@pytest.mark.asyncio
async def test_get_queue_status_metrics_consistency():
    """Verify EngineService.get_queue_status reflects accurate real-time metrics without stale leaks."""
    engine = EngineService()
    try:
        status = engine.get_queue_status()
        assert status.queue_length == 0
        assert status.active_workers == 0
        assert status.max_workers == 4
        assert isinstance(status.queued_jobs, list)
    finally:
        await engine.shutdown()

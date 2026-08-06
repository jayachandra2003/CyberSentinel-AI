"""
Phase 7 Milestone 1 Enterprise Scan Engine Unit Tests.

Verifies Engine Core components:
- ScannerModuleRegistry
- ProgressCalculator
- ScanStateMachine
- QueueManager
- WorkerPoolManager
- ScanOrchestrator backwards compatibility
"""
import pytest
from app.scanner.registry.scanner_module_registry import ScannerModuleRegistry
from app.scanner.engine.progress_calculator import ProgressCalculator
from app.scanner.engine.state_machine import ScanStateMachine, ScanEngineState, InvalidStateTransitionError
from app.scanner.engine.queue_manager import QueueManager, ScanJob
from app.scanner.engine.worker_pool_manager import WorkerPoolManager
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator


def test_scanner_module_registry_defaults():
    registry = ScannerModuleRegistry(register_defaults=True)
    module_ids = registry.list_module_ids()
    assert len(module_ids) == 6
    assert set(module_ids) == {"dns", "whois", "ssl", "headers", "cookies", "tech"}

    standard_mods = registry.get_modules_by_profile("Standard Scan")
    assert len(standard_mods) == 6

    quick_mods = registry.get_modules_by_profile("Quick Scan")
    assert len(quick_mods) == 3


def test_progress_calculator():
    test_cases = [
        (0, 0, 100),
        (0, 6, 0),
        (1, 6, 17),
        (3, 6, 50),
        (6, 6, 100),
    ]

    for completed, enabled, expected in test_cases:
        actual = ProgressCalculator.calculate_progress(completed, enabled)
        assert actual == expected


def test_state_machine_legal_and_illegal_transitions():
    sm = ScanStateMachine(initial_state=ScanEngineState.NEW)
    assert sm.current_state == ScanEngineState.NEW

    # Legal transitions: NEW -> VALIDATING -> QUEUED -> RUNNING -> COMPLETED
    sm.transition_to(ScanEngineState.VALIDATING)
    assert sm.current_state == ScanEngineState.VALIDATING

    sm.transition_to(ScanEngineState.QUEUED)
    assert sm.current_state == ScanEngineState.QUEUED

    sm.transition_to(ScanEngineState.RUNNING)
    assert sm.current_state == ScanEngineState.RUNNING

    sm.transition_to(ScanEngineState.COMPLETED)
    assert sm.current_state == ScanEngineState.COMPLETED
    assert sm.is_terminal() is True

    # Illegal transition attempt (COMPLETED -> RUNNING)
    with pytest.raises(InvalidStateTransitionError):
        sm.transition_to(ScanEngineState.RUNNING)

    # Illegal transition attempt (NEW -> COMPLETED)
    sm_new = ScanStateMachine(initial_state=ScanEngineState.NEW)
    with pytest.raises(InvalidStateTransitionError):
        sm_new.transition_to(ScanEngineState.COMPLETED)


@pytest.mark.asyncio
async def test_queue_manager_operations():
    qm = QueueManager(max_size=10)
    assert qm.size() == 0

    job1 = ScanJob(job_id=101, target_domain="example.com")
    job2 = ScanJob(job_id=102, target_domain="target.org")

    await qm.enqueue(job1)
    await qm.enqueue(job2)
    assert qm.size() == 2

    peeked = qm.peek()
    assert peeked is not None
    assert peeked.job_id == 101
    assert qm.size() == 2

    # Cancel job1
    cancelled = qm.cancel(101)
    assert cancelled is True

    # Dequeue skips cancelled job1 and returns job2
    dequeued = await qm.dequeue()
    assert dequeued.job_id == 102


@pytest.mark.asyncio
async def test_worker_pool_manager_lifecycle():
    qm = QueueManager(max_size=10)
    wp = WorkerPoolManager(queue_manager=qm, max_workers=2)

    assert wp.is_running() is False
    assert wp.active_worker_count == 0

    await wp.start()
    assert wp.is_running() is True

    await wp.stop()
    assert wp.is_running() is False
    assert wp.active_worker_count == 0


def test_scan_orchestrator_backwards_compatibility():
    orchestrator = ScanOrchestrator()
    assert len(orchestrator.modules) == 6
    module_ids = [m.module_id for m in orchestrator.modules]
    assert set(module_ids) == {"dns", "whois", "ssl", "headers", "cookies", "tech"}

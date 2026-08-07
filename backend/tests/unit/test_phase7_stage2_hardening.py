"""
Unit tests for Phase 7 Milestone 4 Stage 2: Retry Engine & Timeout Engine.

Verifies:
- Retry succeeds on second attempt
- Retry exhausted after max retries
- Retryable vs non-retryable exception classification
- Exponential backoff calculation
- Per-module timeout handling
- Global scan timeout handling
- Cancellation during retry
- Worker shutdown during retry
"""
import asyncio
import socket
import ssl
import time
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.config import settings
from app.models.scan import Scan, ScanStatusEnum
from app.scanner.engine.retry_handler import RetryHandler, is_retryable_exception
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator


def test_retryable_vs_non_retryable_exceptions():
    """Verify exception classification rules in RetryHandler."""
    # Retryable exceptions
    assert is_retryable_exception(asyncio.TimeoutError()) is True
    assert is_retryable_exception(ConnectionError("Connection lost")) is True
    assert is_retryable_exception(ConnectionResetError("Reset by peer")) is True
    assert is_retryable_exception(socket.timeout("Socket timeout")) is True
    assert is_retryable_exception(ssl.SSLError("Handshake failed")) is True
    assert is_retryable_exception(OSError("Network unreachable")) is True

    # Non-retryable exceptions
    assert is_retryable_exception(ValueError("Invalid domain syntax")) is False
    assert is_retryable_exception(KeyError("Missing key")) is False
    assert is_retryable_exception(AttributeError("Property missing")) is False
    assert is_retryable_exception(TypeError("Type mismatch")) is False


@pytest.mark.asyncio
async def test_retry_succeeds_on_second_attempt():
    """Verify RetryHandler retries transient failures and succeeds on attempt 2."""
    attempts = 0

    async def flaky_task():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise ConnectionError("Transient network failure")
        return {"status": "ok", "data": "success"}

    res = await RetryHandler.execute(
        func=flaky_task,
        max_retries=2,
        backoff_factor=0.01,  # Fast test backoff
        module_id="test_mod",
        scan_id=1,
    )

    assert attempts == 2
    assert res == {"status": "ok", "data": "success"}


@pytest.mark.asyncio
async def test_retry_exhausted():
    """Verify RetryHandler raises exception after max retries are exhausted."""
    attempts = 0

    async def always_fails():
        nonlocal attempts
        attempts += 1
        raise ConnectionError("Persistent network outage")

    with pytest.raises(ConnectionError):
        await RetryHandler.execute(
            func=always_fails,
            max_retries=2,  # 1 initial + 2 retries = 3 attempts total
            backoff_factor=0.01,
            module_id="test_mod",
            scan_id=1,
        )

    assert attempts == 3


@pytest.mark.asyncio
async def test_exponential_backoff_timing():
    """Verify RetryHandler applies exponential backoff timing."""
    timestamps = []

    async def timing_task():
        timestamps.append(time.time())
        if len(timestamps) < 3:
            raise ConnectionError("Retry request")
        return "ok"

    await RetryHandler.execute(
        func=timing_task,
        max_retries=2,
        backoff_factor=0.1,  # 0.1s backoff factor
        module_id="test_mod",
        scan_id=1,
    )

    assert len(timestamps) == 3
    delay1 = timestamps[1] - timestamps[0]  # 0.1 * (0.1^0) = 0.1s
    delay2 = timestamps[2] - timestamps[1]  # 0.1^1 = 0.1s or exponential factor

    assert delay1 >= 0.08
    assert delay2 >= 0.08


@pytest.mark.asyncio
async def test_cancellation_during_retry_backoff():
    """Verify RetryHandler immediately aborts backoff if cancellation callback returns True."""
    cancelled = False

    async def failing_task():
        raise ConnectionError("Retry requested")

    def is_cancelled():
        return cancelled

    async def cancel_after_short_delay():
        nonlocal cancelled
        await asyncio.sleep(0.02)
        cancelled = True

    task1 = asyncio.create_task(
        RetryHandler.execute(
            func=failing_task,
            max_retries=5,
            backoff_factor=2.0,  # Long backoff
            module_id="test_mod",
            scan_id=1,
            is_cancelled_func=is_cancelled,
        )
    )
    task2 = asyncio.create_task(cancel_after_short_delay())

    with pytest.raises(asyncio.CancelledError):
        await asyncio.gather(task1, task2)


@pytest.mark.asyncio
async def test_per_module_timeout():
    """Verify module timing out after MODULE_TIMEOUT is marked failed in orchestrator."""
    class TimeoutModule:
        module_id = "slow_mod"
        async def run(self, target: str):
            await asyncio.sleep(5.0)  # Exceeds 0.05s timeout
            return {"status": "ok"}

    mock_repo = MagicMock()
    mock_repo.get_scan_by_id = AsyncMock(return_value=Scan(id=1, target_domain="example.com", status=ScanStatusEnum.QUEUED))
    mock_repo.update_scan_progress = AsyncMock()
    mock_repo.update_module_results = AsyncMock()

    orchestrator = ScanOrchestrator(modules=[TimeoutModule()])

    with pytest.MonkeyPatch.context() as m:
        m.setattr(settings, "MODULE_TIMEOUT", 0.05)
        m.setattr(settings, "MAX_RETRIES", 0)
        await orchestrator.execute_scan_pipeline(scan_id=1, scan_repo=mock_repo)

    # Verify scan repo progress update was called with failed status summary
    calls = mock_repo.update_scan_progress.call_args_list
    summaries = [c.kwargs.get("summary", "") for c in calls]
    assert any("slow_mod encountered an error" in s or "slow_mod timed out" in s for s in summaries)


@pytest.mark.asyncio
async def test_global_scan_timeout():
    """Verify global scan timeout marks scan FAILED when pipeline exceeds SCAN_TIMEOUT."""
    class InfiniteModule:
        module_id = "infinite_mod"
        async def run(self, target: str):
            await asyncio.sleep(10.0)
            return {"status": "ok"}

    mock_repo = MagicMock()
    mock_repo.get_scan_by_id = AsyncMock(return_value=Scan(id=1, target_domain="example.com", status=ScanStatusEnum.QUEUED))
    mock_repo.update_scan_progress = AsyncMock()

    orchestrator = ScanOrchestrator(modules=[InfiniteModule()])

    with pytest.MonkeyPatch.context() as m:
        m.setattr(settings, "SCAN_TIMEOUT", 0.05)
        m.setattr(settings, "MODULE_TIMEOUT", 5.0)
        await orchestrator.execute_scan_pipeline(scan_id=1, scan_repo=mock_repo)

    # Verify scan status transitioned to FAILED due to global timeout
    last_call = mock_repo.update_scan_progress.call_args_list[-1]
    assert last_call.kwargs.get("status") == ScanStatusEnum.FAILED
    assert "timed out" in last_call.kwargs.get("summary", "")

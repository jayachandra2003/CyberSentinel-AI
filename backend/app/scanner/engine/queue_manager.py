"""
In-Memory Queue Manager — Enterprise Scan Engine (Phase 7).

Manages queued scan jobs using a thread-safe in-memory asyncio.Queue.
Provides enqueue, dequeue, peek, cancel, and size operations without database persistence.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Union

from app.scanner.engine.state_machine import ScanEngineState, ScanStateMachine

logger = logging.getLogger(__name__)


@dataclass
class ScanJob:
    """Represents an in-memory scan execution task."""

    job_id: Union[str, int]
    target_domain: str
    profile_name: str = "Standard Scan"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    state_machine: ScanStateMachine = field(default_factory=ScanStateMachine)
    extra_params: Dict[str, str] = field(default_factory=dict)


class QueueManager:
    """
    In-memory async queue manager for scan jobs.
    """

    def __init__(self, max_size: int = 100) -> None:
        self._max_size = max_size
        self._queue: asyncio.Queue[ScanJob] = asyncio.Queue(maxsize=max_size)
        self._jobs: Dict[Union[str, int], ScanJob] = {}
        self._cancelled_jobs: set = set()

    @property
    def max_size(self) -> int:
        return self._max_size

    def size(self) -> int:
        """Return the current number of pending queued jobs."""
        return self._queue.qsize()

    def get_job(self, job_id: Union[str, int]) -> Optional[ScanJob]:
        """Retrieve job by ID if present in memory."""
        return self._jobs.get(job_id)

    async def enqueue(self, job: ScanJob) -> None:
        """
        Enqueue a new scan job into memory.
        Transitions job state machine from NEW/VALIDATING -> QUEUED.
        """
        if job.state_machine.can_transition_to(ScanEngineState.QUEUED):
            job.state_machine.transition_to(ScanEngineState.QUEUED)

        self._jobs[job.job_id] = job
        await self._queue.put(job)
        logger.info(f"Enqueued scan job #{job.job_id} for target '{job.target_domain}' (Queue size: {self.size()})")

    async def dequeue(self) -> ScanJob:
        """
        Dequeue next available scan job from queue.
        Skips jobs that were cancelled while waiting in queue.
        """
        while True:
            job = await self._queue.get()
            if job.job_id in self._cancelled_jobs or job.state_machine.current_state == ScanEngineState.CANCELLED:
                logger.info(f"Skipping cancelled job #{job.job_id} dequeued from memory")
                self._queue.task_done()
                continue
            return job

    def peek(self) -> Optional[ScanJob]:
        """
        Inspect the next item in queue without removing it.
        Returns None if queue is empty.
        """
        if self._queue.empty():
            return None
        # Access internal asyncio.Queue list safely for inspection
        queue_list = getattr(self._queue, "_queue", None)
        if queue_list and len(queue_list) > 0:
            return queue_list[0]
        return None

    def cancel(self, job_id: Union[str, int]) -> bool:
        """
        Cancel a queued or pending job in memory.
        Returns True if job was found and state transitioned to CANCELLED.
        """
        self._cancelled_jobs.add(job_id)
        job = self._jobs.get(job_id)
        if job:
            if job.state_machine.can_transition_to(ScanEngineState.CANCELLED):
                job.state_machine.transition_to(ScanEngineState.CANCELLED)
            logger.info(f"Cancelled in-memory scan job #{job_id}")
            return True
        return False

    def list_jobs(self) -> List[ScanJob]:
        """Return list of all current in-memory jobs."""
        return list(self._jobs.values())

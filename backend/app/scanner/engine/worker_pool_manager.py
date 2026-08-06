"""
Worker Pool Manager — Enterprise Scan Engine (Phase 7).

Manages an asynchronous worker pool consuming ScanJob instances from QueueManager.
Worker pool concurrency count is configured via settings.MAX_CONCURRENT_SCANS.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Callable, List, Optional

from app.core.config import settings
from app.scanner.engine.queue_manager import QueueManager, ScanJob
from app.scanner.engine.state_machine import ScanEngineState
from app.scanner.registry.scanner_module_registry import ScannerModuleRegistry

logger = logging.getLogger(__name__)


class WorkerPoolManager:
    """
    Asynchronous worker pool manager driving ScanEngine task workers.
    """

    def __init__(
        self,
        queue_manager: QueueManager,
        registry: Optional[ScannerModuleRegistry] = None,
        max_workers: Optional[int] = None,
    ) -> None:
        self.queue_manager = queue_manager
        self.registry = registry or ScannerModuleRegistry(register_defaults=True)
        self.max_workers = max_workers or settings.MAX_CONCURRENT_SCANS
        self._workers: List[asyncio.Task] = []
        self._running = False
        self._active_workers_count = 0
        self._job_handler: Optional[Callable[[ScanJob], asyncio.Future]] = None

    @property
    def active_worker_count(self) -> int:
        return self._active_workers_count

    def is_running(self) -> bool:
        return self._running

    def set_job_handler(self, handler: Callable[[ScanJob], asyncio.Future]) -> None:
        """Set custom async job handler callback (optional)."""
        self._job_handler = handler

    async def start(self) -> None:
        """Start background worker tasks."""
        if self._running:
            return

        self._running = True
        self._workers = []
        for i in range(self.max_workers):
            task = asyncio.create_task(self._worker_loop(worker_id=i + 1))
            self._workers.append(task)

        logger.info(f"WorkerPoolManager started {len(self._workers)} worker tasks (Max concurrency: {self.max_workers})")

    async def stop(self) -> None:
        """Cancel and stop all background worker tasks cleanly."""
        if not self._running:
            return

        self._running = False
        for task in self._workers:
            task.cancel()

        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers = []
        self._active_workers_count = 0
        logger.info("WorkerPoolManager stopped cleanly.")

    async def _worker_loop(self, worker_id: int) -> None:
        """Background loop executed by each worker task."""
        logger.debug(f"Worker #{worker_id} initialized.")
        while self._running:
            try:
                job = await self.queue_manager.dequeue()
                self._active_workers_count += 1
                try:
                    logger.info(f"Worker #{worker_id} processing job #{job.job_id} ({job.target_domain})")
                    if self._job_handler:
                        await self._job_handler(job)
                    else:
                        await self._process_job(job)
                finally:
                    self._active_workers_count = max(0, self._active_workers_count - 1)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Worker #{worker_id} encountered unhandled exception: {exc}", exc_info=True)

    async def _process_job(self, job: ScanJob) -> None:
        """Default job execution pipeline using ScannerModuleRegistry."""
        if job.state_machine.can_transition_to(ScanEngineState.RUNNING):
            job.state_machine.transition_to(ScanEngineState.RUNNING)

        modules = self.registry.get_modules_by_profile(job.profile_name)
        logger.info(f"Executing {len(modules)} modules for job #{job.job_id}")

        for module in modules:
            if job.state_machine.current_state == ScanEngineState.CANCELLED:
                logger.info(f"Job #{job.job_id} cancelled during module execution")
                break

            mod_id = module.module_id
            try:
                # Execute with MODULE_TIMEOUT guard
                await asyncio.wait_for(module.run(job.target_domain), timeout=float(settings.MODULE_TIMEOUT))
            except asyncio.TimeoutError:
                logger.warning(f"Module '{mod_id}' timed out after {settings.MODULE_TIMEOUT}s for job #{job.job_id}")
            except Exception as exc:
                logger.error(f"Module '{mod_id}' failed for job #{job.job_id}: {exc}")

        if job.state_machine.current_state == ScanEngineState.RUNNING:
            if job.state_machine.can_transition_to(ScanEngineState.COMPLETED):
                job.state_machine.transition_to(ScanEngineState.COMPLETED)

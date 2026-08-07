"""
Engine Service — Enterprise Scan Engine Service Layer (Phase 7 Milestone 2).

Connects REST API endpoints to QueueManager, WorkerPoolManager, ScanStateMachine, and ScannerModuleRegistry.
Enforces duplicate submission prevention, target validation, and batch limits.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import AsyncSessionLocal
from app.models.scan import ScanStatusEnum
from app.repositories.scan_repository import ScanRepository
from app.schemas.scan_engine import (
    BatchScanResponse,
    CancelScanResponse,
    EngineQueueStatusResponse,
    EngineScanDetailsResponse,
    SingleScanResponse,
)
from app.scanner.engine.progress_calculator import ProgressCalculator
from app.scanner.engine.queue_manager import QueueManager, ScanJob
from app.scanner.engine.queue_recovery import QueueRecoveryEngine
from app.scanner.engine.state_machine import ScanEngineState, ScanStateMachine
from app.scanner.engine.worker_pool_manager import WorkerPoolManager
from app.scanner.orchestrator.scan_orchestrator import ScanOrchestrator
from app.scanner.registry.scanner_module_registry import ScannerModuleRegistry
from app.utils.validators import validate_scan_target

logger = logging.getLogger(__name__)


class EngineService:
    """
    Singleton service governing Scan Engine operations.
    """

    _instance: Optional[EngineService] = None

    def __init__(self) -> None:
        self.registry = ScannerModuleRegistry(register_defaults=True)
        self.queue_manager = QueueManager(max_size=settings.MAX_QUEUE_SIZE)
        self.worker_pool = WorkerPoolManager(
            queue_manager=self.queue_manager,
            registry=self.registry,
            max_workers=settings.MAX_CONCURRENT_SCANS,
        )
        self.orchestrator = ScanOrchestrator(registry=self.registry)
        self.worker_pool.set_job_handler(self._execute_job_handler)
        self._background_loop_task: Optional[asyncio.Task] = None
        self._is_recovering = False

    @classmethod
    def get_instance(cls) -> EngineService:
        if cls._instance is None:
            cls._instance = EngineService()
            cls._instance._ensure_started()
        return cls._instance

    def _ensure_started(self) -> None:
        """Start worker pool background task if not already running."""
        if not self.worker_pool.is_running():
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self.worker_pool.start())
            except RuntimeError:
                pass

    async def run_startup_recovery(self, db: AsyncSession) -> Tuple[int, int]:
        """
        Executes startup recovery to clean up stale RUNNING scans and re-enqueue QUEUED scans.
        """
        return await QueueRecoveryEngine.recover_on_startup(db, self.queue_manager)

    async def shutdown(self) -> None:
        """
        Executes graceful engine shutdown:
        1. Stops accepting new scan submissions.
        2. Cleanly cancels worker tasks.
        """
        logger.info("EngineService shutting down gracefully...")
        await self.worker_pool.shutdown()
        logger.info("EngineService graceful shutdown complete.")

    async def _execute_job_handler(self, job: ScanJob) -> None:
        """Background handler executed by worker tasks for each dequeued job."""
        scan_id = int(job.job_id) if str(job.job_id).isdigit() else 0
        if scan_id > 0:
            if job.state_machine.can_transition_to(ScanEngineState.RUNNING):
                job.state_machine.transition_to(ScanEngineState.RUNNING)
            async with AsyncSessionLocal() as session:
                scan_repo = ScanRepository(session)
                try:
                    await self.orchestrator.execute_scan_pipeline(scan_id, scan_repo)
                    final_scan = await scan_repo.get_scan_by_id(scan_id)
                    if final_scan:
                        if final_scan.status == ScanStatusEnum.COMPLETED and job.state_machine.can_transition_to(ScanEngineState.COMPLETED):
                            job.state_machine.transition_to(ScanEngineState.COMPLETED)
                        elif final_scan.status == ScanStatusEnum.FAILED and job.state_machine.can_transition_to(ScanEngineState.FAILED):
                            job.state_machine.transition_to(ScanEngineState.FAILED)
                        elif final_scan.status == ScanStatusEnum.CANCELLED and job.state_machine.can_transition_to(ScanEngineState.CANCELLED):
                            job.state_machine.transition_to(ScanEngineState.CANCELLED)
                except Exception as exc:
                    logger.error(f"Engine pipeline error for scan #{scan_id}: {exc}", exc_info=True)
                    if job.state_machine.can_transition_to(ScanEngineState.FAILED):
                        job.state_machine.transition_to(ScanEngineState.FAILED)
                finally:
                    if job.state_machine.current_state == ScanEngineState.RUNNING:
                        if job.state_machine.can_transition_to(ScanEngineState.COMPLETED):
                            job.state_machine.transition_to(ScanEngineState.COMPLETED)

    async def submit_single_scan(
        self,
        user_id: int,
        target_raw: str,
        profile: str,
        db: AsyncSession,
    ) -> SingleScanResponse:
        """
        Validates target, checks for duplicate active scan, creates DB record, and enqueues job.
        """
        if not self.worker_pool.accepting_jobs:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Scan engine is currently shutting down.",
            )
        is_valid, domain, error_reason = validate_scan_target(target_raw)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Target validation failed: {error_reason}",
            )

        scan_repo = ScanRepository(db)

        # Check for active duplicate scan (QUEUED or RUNNING) in DB and in-memory queue
        existing_scans = await scan_repo.get_user_scans(user_id)
        for s in existing_scans:
            if s.target_domain.lower() == domain.lower() and s.status in (ScanStatusEnum.QUEUED, ScanStatusEnum.RUNNING):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A scan for target '{domain}' is already queued or running.",
                )

        for job in self.queue_manager.list_jobs():
            if job.target_domain.lower() == domain.lower() and job.state_machine.current_state in (ScanEngineState.QUEUED, ScanEngineState.RUNNING):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A scan for target '{domain}' is already queued or running.",
                )

        scan = await scan_repo.create_scan(
            user_id=user_id,
            target_domain=domain,
            scan_type=profile or "Standard Scan",
        )

        sm = ScanStateMachine(initial_state=ScanEngineState.NEW)
        sm.transition_to(ScanEngineState.VALIDATING)

        job = ScanJob(
            job_id=scan.id,
            target_domain=domain,
            profile_name=profile or "Standard Scan",
            state_machine=sm,
        )

        await self.queue_manager.enqueue(job)
        self._ensure_started()

        return SingleScanResponse(
            scan_id=scan.id,
            target=domain,
            status=ScanStatusEnum.QUEUED.value,
            current_state=sm.current_state.value,
            profile=profile or "Standard Scan",
            created_at=scan.created_at,
        )

    async def submit_batch_scans(
        self,
        user_id: int,
        targets: List[str],
        profile: str,
        db: AsyncSession,
    ) -> BatchScanResponse:
        """
        Validates batch payload and enqueues multiple targets.
        """
        if not self.worker_pool.accepting_jobs:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Scan engine is currently shutting down.",
            )

        if not targets:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch target list cannot be empty.",
            )

        if len(targets) > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch size ({len(targets)}) exceeds maximum allowed limit ({settings.MAX_BATCH_SIZE}).",
            )

        batch_id = f"batch-{int(time.time())}"
        scan_ids: List[int] = []
        failed_targets: List[Dict[str, str]] = []

        scan_repo = ScanRepository(db)
        existing_scans = await scan_repo.get_user_scans(user_id)
        active_domains = {
            s.target_domain.lower()
            for s in existing_scans
            if s.status in (ScanStatusEnum.QUEUED, ScanStatusEnum.RUNNING)
        }

        for target_raw in targets:
            is_valid, domain, error_reason = validate_scan_target(target_raw)
            if not is_valid:
                failed_targets.append({"target": target_raw, "reason": error_reason})
                continue

            if domain.lower() in active_domains:
                failed_targets.append({"target": target_raw, "reason": "Target already has an active queued/running scan."})
                continue

            active_domains.add(domain.lower())

            scan = await scan_repo.create_scan(
                user_id=user_id,
                target_domain=domain,
                scan_type=profile or "Standard Scan",
            )

            sm = ScanStateMachine(initial_state=ScanEngineState.NEW)
            sm.transition_to(ScanEngineState.VALIDATING)

            job = ScanJob(
                job_id=scan.id,
                target_domain=domain,
                profile_name=profile or "Standard Scan",
                state_machine=sm,
            )

            await self.queue_manager.enqueue(job)
            scan_ids.append(scan.id)

        self._ensure_started()

        return BatchScanResponse(
            batch_id=batch_id,
            total_jobs=len(targets),
            queued_jobs=len(scan_ids),
            scan_ids=scan_ids,
            failed_targets=failed_targets,
        )

    def get_queue_status(self) -> EngineQueueStatusResponse:
        """
        Returns Engine queue metrics and in-memory queued jobs list.
        All metrics derive directly from the synchronized worker pool and queue state.
        """
        jobs = self.queue_manager.list_jobs()
        active_queued_jobs = [
            {
                "job_id": j.job_id,
                "target_domain": j.target_domain,
                "profile": j.profile_name,
                "state": j.state_machine.current_state.value,
                "created_at": j.created_at.isoformat(),
            }
            for j in jobs
            if j.state_machine.current_state in (ScanEngineState.QUEUED, ScanEngineState.RUNNING)
        ]

        active_workers = self.worker_pool.active_worker_count

        return EngineQueueStatusResponse(
            queue_length=self.queue_manager.size(),
            running_scans=active_workers,
            active_workers=active_workers,
            max_workers=settings.MAX_CONCURRENT_SCANS,
            queued_jobs=active_queued_jobs,
        )

    async def cancel_scan(
        self,
        scan_id: int,
        db: AsyncSession,
    ) -> CancelScanResponse:
        """
        Cancels scan in memory and updates DB record to CANCELLED.
        """
        scan_repo = ScanRepository(db)
        scan = await scan_repo.get_scan_by_id(scan_id)
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scan record #{scan_id} not found.",
            )

        # Cancel in QueueManager
        self.queue_manager.cancel(scan_id)

        # Update DB status to CANCELLED
        await scan_repo.update_scan_progress(
            scan_id=scan_id,
            status=ScanStatusEnum.CANCELLED,
            progress=scan.progress or 0,
            summary="Scan execution cancelled by user.",
        )

        return CancelScanResponse(
            scan_id=scan_id,
            status=ScanStatusEnum.CANCELLED.value,
            current_state=ScanEngineState.CANCELLED.value,
            message=f"Scan #{scan_id} cancelled successfully.",
        )

    async def get_scan_details(
        self,
        scan_id: int,
        db: AsyncSession,
    ) -> EngineScanDetailsResponse:
        """
        Retrieves detailed scan status, module completion status, and progress.
        """
        scan_repo = ScanRepository(db)
        scan = await scan_repo.get_scan_by_id(scan_id)
        if not scan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scan record #{scan_id} not found.",
            )

        module_results = scan.module_results or {}
        enabled_modules = self.registry.get_modules_by_profile(scan.scan_type)
        module_status: Dict[str, str] = {}

        for mod in enabled_modules:
            mod_id = mod.module_id
            if mod_id in module_results:
                module_status[mod_id] = "completed"
            elif scan.status == ScanStatusEnum.RUNNING:
                module_status[mod_id] = "running"
            elif scan.status == ScanStatusEnum.COMPLETED:
                module_status[mod_id] = "completed"
            elif scan.status == ScanStatusEnum.FAILED:
                module_status[mod_id] = "failed"
            elif scan.status == ScanStatusEnum.CANCELLED:
                module_status[mod_id] = "cancelled"
            else:
                module_status[mod_id] = "queued"

        job = self.queue_manager.get_job(scan_id)
        current_state = job.state_machine.current_state.value if job else scan.status.value

        return EngineScanDetailsResponse(
            scan_id=scan.id,
            target_domain=scan.target_domain,
            status=scan.status.value,
            current_state=current_state,
            progress=scan.progress or 0,
            profile=scan.scan_type or "Standard Scan",
            module_status=module_status,
            created_at=scan.created_at,
            started_at=scan.started_at,
            completed_at=scan.completed_at,
            duration=scan.duration,
            summary=scan.summary,
        )


engine_service = EngineService.get_instance()

"""
Queue Recovery Engine — Enterprise Scan Engine (Phase 7 Stage 1).

Handles queue recovery after unexpected backend restarts:
1. Detects scans left in RUNNING state in DB and marks them FAILED with an appropriate reason.
2. Reloads QUEUED scans from DB back into the in-memory QueueManager.
3. Prevents duplicate execution by checking in-memory queue state before re-enqueuing.
4. Gated by settings.QUEUE_RECOVERY_ENABLED.
"""
from __future__ import annotations

import logging
from typing import Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.scan import Scan, ScanStatusEnum
from app.scanner.engine.queue_manager import QueueManager, ScanJob
from app.scanner.engine.state_machine import ScanEngineState, ScanStateMachine

logger = logging.getLogger(__name__)


class QueueRecoveryEngine:
    """
    Orchestrates startup queue recovery and stale scan cleanup.
    """

    @staticmethod
    async def recover_on_startup(
        db: AsyncSession,
        queue_manager: QueueManager,
    ) -> Tuple[int, int]:
        """
        Scans DB for interrupted RUNNING scans and un-processed QUEUED scans on server startup.
        
        Returns:
            Tuple[requeued_count, failed_running_count]
        """
        if not getattr(settings, "QUEUE_RECOVERY_ENABLED", True):
            logger.info("Queue recovery disabled by configuration (QUEUE_RECOVERY_ENABLED=False).")
            return 0, 0

        requeued_count = 0
        failed_running_count = 0

        try:
            # 1. Handle interrupted RUNNING scans -> transition to FAILED
            stmt_running = select(Scan).where(Scan.status == ScanStatusEnum.RUNNING)
            res_running = await db.execute(stmt_running)
            running_scans = res_running.scalars().all()

            for scan in running_scans:
                scan.status = ScanStatusEnum.FAILED
                scan.summary = "Scan execution interrupted by server restart."
                failed_running_count += 1
                logger.warning(
                    f"[QUEUE_RECOVERY] Stale RUNNING scan #{scan.id} for target '{scan.target_domain}' marked as FAILED."
                )

            # 2. Handle pending QUEUED scans -> reload into QueueManager
            stmt_queued = select(Scan).where(Scan.status == ScanStatusEnum.QUEUED)
            res_queued = await db.execute(stmt_queued)
            queued_scans = res_queued.scalars().all()

            existing_job_ids = {j.job_id for j in queue_manager.list_jobs()}

            for scan in queued_scans:
                if scan.id in existing_job_ids:
                    logger.info(f"[QUEUE_RECOVERY] Scan #{scan.id} is already in-memory, skipping duplicate re-enqueue.")
                    continue

                sm = ScanStateMachine(initial_state=ScanEngineState.NEW)
                sm.transition_to(ScanEngineState.VALIDATING)

                job = ScanJob(
                    job_id=scan.id,
                    target_domain=scan.target_domain,
                    profile_name=scan.scan_type or "Standard Scan",
                    state_machine=sm,
                )
                await queue_manager.enqueue(job)
                requeued_count += 1
                logger.info(f"[QUEUE_RECOVERY] Reloaded QUEUED scan #{scan.id} for '{scan.target_domain}' into memory queue.")

            await db.commit()

        except Exception as exc:
            await db.rollback()
            logger.error(f"[QUEUE_RECOVERY] Failed to execute startup recovery: {exc}", exc_info=True)

        logger.info(
            f"[QUEUE_RECOVERY] Recovery complete: {requeued_count} queued scan(s) re-enqueued, "
            f"{failed_running_count} stale running scan(s) marked failed."
        )

        return requeued_count, failed_running_count

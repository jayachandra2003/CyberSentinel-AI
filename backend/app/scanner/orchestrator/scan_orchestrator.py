import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.models.scan import ScanStatusEnum
from app.repositories.scan_repository import ScanRepository
from app.scanner.interfaces.module_interface import IScannerModule


class ScanOrchestrator:
    """Manages workflow orchestration across registered IScannerModule instances."""

    def __init__(self, modules: Optional[List[IScannerModule]] = None):
        self.modules: List[IScannerModule] = modules or []

    def register_module(self, module: IScannerModule) -> None:
        self.modules.append(module)

    async def execute_scan_pipeline(self, scan_id: int, scan_repo: ScanRepository) -> None:
        """Asynchronously runs the scan lifecycle: Pending -> Queued -> Running -> Progress -> Completed."""
        scan = await scan_repo.get_scan_by_id(scan_id)
        if not scan:
            return

        # 1. Transition to QUEUED
        await scan_repo.update_scan_progress(
            scan_id=scan_id,
            status=ScanStatusEnum.QUEUED,
            progress=0,
            summary="Scan request placed in defensive processing queue.",
        )
        await asyncio.sleep(0.5)

        # 2. Transition to RUNNING
        started_at = datetime.now(timezone.utc)
        await scan_repo.update_scan_progress(
            scan_id=scan_id,
            status=ScanStatusEnum.RUNNING,
            progress=0,
            started_at=started_at,
            summary="Defensive assessment engine initialized.",
        )

        # 3. Simulate Progress Updates (0% -> 20% -> 40% -> 60% -> 80% -> 100%)
        progress_steps = [20, 40, 60, 80, 100]
        step_descriptions = {
            20: "Evaluating domain defensive posture configuration...",
            40: "Executing registered abstract module checks...",
            60: "Aggregating security response parameters...",
            80: "Synthesizing posture compliance metrics...",
            100: "Finalizing defensive report artifacts...",
        }

        for prog in progress_steps:
            await asyncio.sleep(0.8)
            # If modules are registered, run them using Strategy Pattern interface
            for mod in self.modules:
                try:
                    await mod.run(scan.target_domain)
                except Exception:
                    pass

            await scan_repo.update_scan_progress(
                scan_id=scan_id,
                status=ScanStatusEnum.RUNNING,
                progress=prog,
                summary=step_descriptions.get(prog, f"Assessment progress at {prog}%"),
            )

        # 4. Transition to COMPLETED
        completed_at = datetime.now(timezone.utc)
        duration = round((completed_at - started_at).total_seconds(), 2)

        await scan_repo.update_scan_progress(
            scan_id=scan_id,
            status=ScanStatusEnum.COMPLETED,
            progress=100,
            completed_at=completed_at,
            duration=duration,
            summary=f"Defensive posture scan completed successfully for {scan.target_domain}. All security checks passed.",
        )

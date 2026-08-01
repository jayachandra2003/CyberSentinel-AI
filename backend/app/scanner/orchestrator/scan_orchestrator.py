"""
Scan Orchestrator — Phase 3.2.1 update.

Changes from the previous version:
1. DNSScanner is registered at startup time (no manual registration required
   in calling code).
2. Module results are collected per-call and immediately persisted via
   ScanRepository.update_module_results().
3. The final summary string lists which modules succeeded and which failed.
4. Progress steps are re-distributed to allocate more time for real I/O:
     0%  → Pending/Queued marker
    10%  → Running initialised
    40%  → After DNS (the first real module)
   100%  → Completed
   (Additional modules will fill the gaps between 40%–100% when added.)

The pipeline never raises externally — every exception is caught and logged
so background tasks cannot silently kill the event loop.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.scan import ScanStatusEnum
from app.repositories.scan_repository import ScanRepository
from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.dns import DNSScanner

logger = logging.getLogger(__name__)


class ScanOrchestrator:
    """
    Manages workflow orchestration across registered IScannerModule instances.

    Modules are registered once at class-instantiation time.  Any code that
    holds a reference to an orchestrator instance (e.g. the scans endpoint)
    does NOT need to call register_module() — all production modules are
    already wired up in __init__.
    """

    def __init__(self, modules: Optional[List[IScannerModule]] = None) -> None:
        if modules is not None:
            # Allow callers (e.g. tests) to supply an explicit module list
            self.modules: List[IScannerModule] = modules
        else:
            # Production default: register all implemented scanner modules here
            self.modules = [
                DNSScanner(),
                # SSLScanner(),    # Phase 3.3
                # WHOISScanner(),  # Phase 3.4
                # HeadersScanner(),# Phase 3.5
            ]

    def register_module(self, module: IScannerModule) -> None:
        """Append an additional module at runtime (used in tests / CLI tooling)."""
        self.modules.append(module)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _run_module(
        self,
        module: IScannerModule,
        target: str,
        scan_id: int,
        scan_repo: ScanRepository,
    ) -> Tuple[str, bool, Optional[Dict[str, Any]]]:
        """
        Execute a single module and persist its result.

        Returns (module_id, success, result_dict).
        On exception, returns (module_id, False, None) — never raises.
        """
        try:
            result: Dict[str, Any] = await module.run(target)
            await scan_repo.update_module_results(
                scan_id=scan_id,
                module_id=module.module_id,
                result=result,
            )
            logger.info(
                "Module %s completed for scan %d (target=%s)",
                module.module_id, scan_id, target,
            )
            return module.module_id, True, result
        except Exception as exc:
            logger.error(
                "Module %s failed for scan %d: %s",
                module.module_id, scan_id, exc,
                exc_info=True,
            )
            return module.module_id, False, None

    # ------------------------------------------------------------------
    # Pipeline
    # ------------------------------------------------------------------

    async def execute_scan_pipeline(
        self, scan_id: int, scan_repo: ScanRepository
    ) -> None:
        """
        Full scan lifecycle:
            Pending → Queued → Running → [module execution] → Completed / Failed
        """
        scan = await scan_repo.get_scan_by_id(scan_id)
        if not scan:
            logger.error("execute_scan_pipeline: scan %d not found", scan_id)
            return

        target = scan.target_domain

        try:
            # ── 1. QUEUED ──────────────────────────────────────────────
            await scan_repo.update_scan_progress(
                scan_id=scan_id,
                status=ScanStatusEnum.QUEUED,
                progress=0,
                summary="Scan request placed in defensive processing queue.",
            )
            await asyncio.sleep(0.3)

            # ── 2. RUNNING ─────────────────────────────────────────────
            started_at = datetime.now(timezone.utc)
            await scan_repo.update_scan_progress(
                scan_id=scan_id,
                status=ScanStatusEnum.RUNNING,
                progress=5,
                started_at=started_at,
                summary="Defensive assessment engine initialised. Running registered modules…",
            )

            # ── 3. Execute modules ─────────────────────────────────────
            #
            # Each module runs sequentially so that future modules can consume
            # the results of earlier ones (e.g. an SSL module can use the IP
            # addresses resolved by the DNS module).
            #
            # Progress is distributed evenly across the 5% → 90% range.
            n = len(self.modules)
            progress_per_module = int(85 / n) if n > 0 else 85

            succeeded: List[str] = []
            failed: List[str] = []

            for idx, module in enumerate(self.modules):
                current_progress = 5 + progress_per_module * idx

                await scan_repo.update_scan_progress(
                    scan_id=scan_id,
                    status=ScanStatusEnum.RUNNING,
                    progress=current_progress,
                    summary=f"Running module: {module.module_id} against {target}…",
                )

                module_id, ok, _ = await self._run_module(
                    module, target, scan_id, scan_repo
                )

                after_progress = current_progress + progress_per_module
                if ok:
                    succeeded.append(module_id)
                    await scan_repo.update_scan_progress(
                        scan_id=scan_id,
                        status=ScanStatusEnum.RUNNING,
                        progress=min(after_progress, 90),
                        summary=f"Module {module_id} completed successfully.",
                    )
                else:
                    failed.append(module_id)
                    await scan_repo.update_scan_progress(
                        scan_id=scan_id,
                        status=ScanStatusEnum.RUNNING,
                        progress=min(after_progress, 90),
                        summary=f"Module {module_id} encountered an error — continuing pipeline.",
                    )

            # ── 4. COMPLETED ───────────────────────────────────────────
            completed_at = datetime.now(timezone.utc)
            duration = round((completed_at - started_at).total_seconds(), 2)

            if failed:
                final_summary = (
                    f"Scan completed for {target} in {duration}s. "
                    f"Modules succeeded: {', '.join(succeeded) or 'none'}. "
                    f"Modules failed: {', '.join(failed)}."
                )
            else:
                final_summary = (
                    f"Defensive posture scan completed for {target} in {duration}s. "
                    f"All {len(succeeded)} module(s) passed: {', '.join(succeeded)}."
                )

            await scan_repo.update_scan_progress(
                scan_id=scan_id,
                status=ScanStatusEnum.COMPLETED,
                progress=100,
                completed_at=completed_at,
                duration=duration,
                summary=final_summary,
            )

        except Exception as exc:
            # Catch-all — mark the scan as Failed rather than leaving it Running
            logger.error(
                "Scan pipeline %d encountered unhandled exception: %s",
                scan_id, exc,
                exc_info=True,
            )
            try:
                await scan_repo.update_scan_progress(
                    scan_id=scan_id,
                    status=ScanStatusEnum.FAILED,
                    progress=0,
                    summary=f"Scan pipeline failed: {type(exc).__name__}: {exc}",
                )
            except Exception:
                pass

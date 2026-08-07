"""
Scan Orchestrator — Defensive Scanner Pipeline.

Manages sequential execution and progress updates across registered IScannerModule instances.
Module results are collected per-call and immediately persisted via ScanRepository.update_module_results().
The pipeline never raises externally — every exception is caught and logged so background tasks cannot silently kill the event loop.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.scan import ScanStatusEnum
from app.repositories.scan_repository import ScanRepository
from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.cookies import CookieScanner
from app.scanner.modules.dns import DNSScanner
from app.scanner.modules.headers import HeadersScanner
from app.scanner.modules.ssl import SSLScanner
from app.scanner.modules.tech import TechScanner
from app.scanner.modules.whois import WHOISScanner

from app.core.config import settings
from app.models.scan import ScanStatusEnum
from app.repositories.scan_repository import ScanRepository
from app.scanner.engine.progress_calculator import ProgressCalculator
from app.scanner.engine.retry_handler import RetryHandler
from app.scanner.registry.scanner_module_registry import ScannerModuleRegistry

logger = logging.getLogger(__name__)


class ScanOrchestrator:
    """
    Manages workflow orchestration across registered IScannerModule instances.

    Modules are registered once at class-instantiation time. Any code that
    holds a reference to an orchestrator instance (e.g. the scans endpoint)
    does NOT need to call register_module() — all production modules are
    already wired up in __init__.
    """

    def __init__(
        self,
        modules: Optional[List[IScannerModule]] = None,
        registry: Optional[ScannerModuleRegistry] = None,
    ) -> None:
        self.registry = registry or ScannerModuleRegistry(register_defaults=(modules is None))
        if modules is not None:
            # Allow callers (e.g. tests) to supply an explicit module list
            self.modules: List[IScannerModule] = modules
            for mod in modules:
                self.registry.register(mod)
        else:
            # Production default: register all implemented scanner modules via registry
            self.modules = self.registry.get_enabled_modules()

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
        Execute a single module wrapped with RetryHandler and per-module timeout.

        Returns (module_id, success, result_dict).
        On exception/exhaustion, returns (module_id, False, None) — never raises.
        """
        async def _attempt_module() -> Dict[str, Any]:
            return await asyncio.wait_for(
                module.run(target),
                timeout=float(getattr(settings, "MODULE_TIMEOUT", 25)),
            )

        async def _is_cancelled_check() -> bool:
            curr_scan = await scan_repo.get_scan_by_id(scan_id)
            if curr_scan and curr_scan.status == ScanStatusEnum.CANCELLED:
                return True
            return False

        try:
            result: Dict[str, Any] = await RetryHandler.execute(
                func=_attempt_module,
                max_retries=getattr(settings, "MAX_RETRIES", 2),
                backoff_factor=getattr(settings, "RETRY_BACKOFF_FACTOR", 1.5),
                module_id=module.module_id,
                scan_id=scan_id,
                is_cancelled_func=None,
            )
            await scan_repo.update_module_results(
                scan_id=scan_id,
                module_id=module.module_id,
                result=result,
            )
            logger.info(
                "[MODULE_COMPLETED] Module %s completed for scan %d (target=%s)",
                module.module_id, scan_id, target,
            )
            return module.module_id, True, result
        except asyncio.TimeoutError:
            logger.warning(
                "[MODULE_TIMEOUT] Module %s timed out after %ds for scan %d",
                module.module_id, getattr(settings, "MODULE_TIMEOUT", 25), scan_id,
            )
            return module.module_id, False, None
        except Exception as exc:
            logger.error(
                "[MODULE_FAILED] Module %s failed for scan %d: %s",
                module.module_id, scan_id, exc,
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
            Pending → Queued → Running → [module execution with retries & timeouts] → Completed / Failed
        """
        scan = await scan_repo.get_scan_by_id(scan_id)
        if not scan:
            logger.error("execute_scan_pipeline: scan %d not found", scan_id)
            return

        target = scan.target_domain

        try:
            # Check for cancellation before entering RUNNING
            scan = await scan_repo.get_scan_by_id(scan_id)
            if scan and scan.status == ScanStatusEnum.CANCELLED:
                logger.info(f"Scan #{scan_id} was cancelled before starting execution.")
                return

            # ── 1. RUNNING ─────────────────────────────────────────────
            started_at = datetime.now(timezone.utc)
            await scan_repo.update_scan_progress(
                scan_id=scan_id,
                status=ScanStatusEnum.RUNNING,
                progress=5,
                started_at=started_at,
                summary="Defensive assessment engine initialised. Running registered modules…",
            )

            # ── 3. Execute modules with Global Scan Timeout ─────────────
            total_enabled_modules = len(self.modules)
            succeeded: List[str] = []
            failed: List[str] = []

            async def _run_all_modules():
                for idx, module in enumerate(self.modules):
                    # Check cancellation state before running next module
                    curr_scan = await scan_repo.get_scan_by_id(scan_id)
                    if curr_scan and curr_scan.status == ScanStatusEnum.CANCELLED:
                        logger.info(f"Scan #{scan_id} cancelled during module pipeline execution.")
                        return False

                    current_progress = ProgressCalculator.calculate_progress(idx, total_enabled_modules)

                    await scan_repo.update_scan_progress(
                        scan_id=scan_id,
                        status=ScanStatusEnum.RUNNING,
                        progress=current_progress,
                        summary=f"Running module: {module.module_id} against {target}…",
                    )

                    module_id, ok, _ = await self._run_module(
                        module, target, scan_id, scan_repo
                    )

                    after_progress = ProgressCalculator.calculate_progress(idx + 1, total_enabled_modules)
                    if ok:
                        succeeded.append(module_id)
                        await scan_repo.update_scan_progress(
                            scan_id=scan_id,
                            status=ScanStatusEnum.RUNNING,
                            progress=min(after_progress, 99),
                            summary=f"Module {module_id} completed successfully.",
                        )
                    else:
                        failed.append(module_id)
                        await scan_repo.update_scan_progress(
                            scan_id=scan_id,
                            status=ScanStatusEnum.RUNNING,
                            progress=min(after_progress, 99),
                            summary=f"Module {module_id} encountered an error — continuing pipeline.",
                        )
                return True

            try:
                completed_cleanly = await asyncio.wait_for(
                    _run_all_modules(),
                    timeout=float(getattr(settings, "SCAN_TIMEOUT", 180)),
                )
                if not completed_cleanly:
                    return
            except asyncio.TimeoutError:
                logger.error(
                    f"[SCAN_TIMEOUT] Global scan timeout of {getattr(settings, 'SCAN_TIMEOUT', 180)}s exceeded for scan #{scan_id}"
                )
                await scan_repo.update_scan_progress(
                    scan_id=scan_id,
                    status=ScanStatusEnum.FAILED,
                    progress=0,
                    summary=f"Scan execution timed out after {getattr(settings, 'SCAN_TIMEOUT', 180)}s.",
                )
                return

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

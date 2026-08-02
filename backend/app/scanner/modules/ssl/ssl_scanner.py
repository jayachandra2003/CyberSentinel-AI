from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.ssl.ssl_models import (
    RiskLevelEnum,
    SslScanResult,
)
from app.scanner.modules.ssl.utils import (
    calculate_ssl_risk_score,
    derive_ssl_observations,
    fetch_ssl_data_sync,
    sanitise_domain,
)

logger = logging.getLogger(__name__)


class SSLScanner(IScannerModule):
    """
    Enterprise SSL/TLS Security Analysis Module.

    Performs live TLS handshake inspection for target domain to extract certificate
    authority, validity period, expiration risk, protocol version, and cipher strength.

    Design principles:
    - Implements IScannerModule so it plugs directly into ScanOrchestrator.
    - All network I/O runs in thread pool via asyncio.to_thread to protect event loop.
    - Never raises uncaught exceptions; returns graceful structured SslScanResult.
    """

    @property
    def module_id(self) -> str:
        return "ssl"

    @property
    def name(self) -> str:
        return "SSL/TLS Security Analysis"

    async def run(self, target: str) -> Dict[str, Any]:
        """Executes SSL/TLS analysis against target domain."""
        clean_domain = sanitise_domain(target)
        if not clean_domain:
            res = SslScanResult(
                module_id=self.module_id,
                status="error",
                target=target,
                is_valid=False,
                error_message="Invalid or empty target domain provided.",
                risk_score=50,
                risk_level=RiskLevelEnum.HIGH,
            )
            return res.model_dump()

        try:
            # Run socket TLS handshake in thread pool to prevent event loop blocking
            raw_res = await asyncio.to_thread(fetch_ssl_data_sync, clean_domain)

            is_valid = raw_res.get("ok", False)
            error_message = raw_res.get("error")
            cert_info = raw_res.get("cert_info")
            protocol_info = raw_res.get("protocol_info")

            observations = derive_ssl_observations(
                cert_info=cert_info,
                protocol_info=protocol_info,
                is_valid=is_valid,
                error_message=error_message,
            )
            risk_score, risk_level = calculate_ssl_risk_score(observations)

            result = SslScanResult(
                module_id=self.module_id,
                status="completed" if is_valid else "error",
                target=clean_domain,
                is_valid=is_valid,
                error_message=error_message,
                certificate=cert_info,
                protocol=protocol_info,
                risk_score=risk_score,
                risk_level=risk_level,
                security_observations=observations,
            )
            return result.model_dump()

        except Exception as exc:
            logger.error("SSLScanner error for target %s: %s", target, exc, exc_info=True)
            fallback = SslScanResult(
                module_id=self.module_id,
                status="error",
                target=target,
                is_valid=False,
                error_message=f"SSL analysis failed: {type(exc).__name__}: {str(exc)}",
                risk_score=50,
                risk_level=RiskLevelEnum.HIGH,
            )
            return fallback.model_dump()

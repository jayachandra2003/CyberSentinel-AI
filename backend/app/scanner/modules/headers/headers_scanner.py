from __future__ import annotations

import logging
from typing import Any, Dict

from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.headers.headers_models import (
    HeadersScanResult,
    RiskLevelEnum,
)
from app.scanner.modules.headers.utils import (
    analyze_security_headers,
    fetch_headers_async,
    sanitise_domain,
)

logger = logging.getLogger(__name__)


class HeadersScanner(IScannerModule):
    """
    Enterprise HTTP Security Headers Analysis Module.

    Evaluates active browser security controls, anti-clickjacking headers, XSS prevention policies,
    HSTS enforcement, and information disclosure headers served over HTTP/HTTPS.
    """

    @property
    def module_id(self) -> str:
        return "headers"

    @property
    def name(self) -> str:
        return "HTTP Security Headers Analysis"

    async def run(self, target: str) -> Dict[str, Any]:
        """Executes HTTP security header analysis against target domain."""
        clean_domain = sanitise_domain(target)
        if not clean_domain:
            res = HeadersScanResult(
                module_id=self.module_id,
                status="error",
                target=target,
                risk_score=50,
                risk_level=RiskLevelEnum.HIGH,
            )
            return res.model_dump()

        try:
            # Perform non-blocking async HTTP request
            fetch_res = await fetch_headers_async(clean_domain)

            if not fetch_res.get("ok", False):
                err_msg = fetch_res.get("error", "HTTP request failed.")
                res = HeadersScanResult(
                    module_id=self.module_id,
                    status="error",
                    target=clean_domain,
                    risk_score=50,
                    risk_level=RiskLevelEnum.HIGH,
                )
                return res.model_dump()

            raw_headers = fetch_res.get("raw_headers", {})
            is_https = fetch_res.get("is_https", True)
            effective_url = fetch_res.get("url")
            status_code = fetch_res.get("status_code")

            analyzed_items, observations, risk_score, risk_level = analyze_security_headers(
                raw_headers=raw_headers, is_https=is_https
            )

            result = HeadersScanResult(
                module_id=self.module_id,
                status="completed",
                target=clean_domain,
                effective_url=effective_url,
                status_code=status_code,
                headers_count=len(raw_headers),
                risk_score=risk_score,
                risk_level=risk_level,
                analyzed_headers=analyzed_items,
                raw_headers=raw_headers,
                security_observations=observations,
            )
            return result.model_dump()

        except Exception as exc:
            logger.error("HeadersScanner error for target %s: %s", target, exc, exc_info=True)
            fallback = HeadersScanResult(
                module_id=self.module_id,
                status="error",
                target=target,
                risk_score=50,
                risk_level=RiskLevelEnum.HIGH,
            )
            return fallback.model_dump()

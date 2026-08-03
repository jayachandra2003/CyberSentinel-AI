from __future__ import annotations

import logging
from typing import Any, Dict

from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.cookies.cookie_models import (
    CookieScanResult,
    RiskLevelEnum,
)
from app.scanner.modules.cookies.utils import (
    evaluate_cookie_security_rules,
    fetch_cookies_async,
    sanitise_domain,
)

logger = logging.getLogger(__name__)


class CookieScanner(IScannerModule):
    """
    Enterprise Cookie Security Analysis Module.

    Evaluates HTTP response cookies, session protection attributes (Secure, HttpOnly, SameSite),
    cookie prefixes (__Host-, __Secure-), lifetime attributes (Max-Age, Expires), and domain scoping.
    """

    @property
    def module_id(self) -> str:
        return "cookies"

    @property
    def name(self) -> str:
        return "Cookie Security Analysis"

    async def run(self, target: str) -> Dict[str, Any]:
        """Executes Cookie security analysis against target domain."""
        clean_domain = sanitise_domain(target)
        if not clean_domain:
            res = CookieScanResult(
                module_id=self.module_id,
                status="error",
                target=target,
                risk_score=50,
                risk_level=RiskLevelEnum.HIGH,
            )
            return res.model_dump()

        try:
            # Perform non-blocking async HTTP request to capture Set-Cookie headers
            fetch_res = await fetch_cookies_async(clean_domain)

            if not fetch_res.get("ok", False):
                res = CookieScanResult(
                    module_id=self.module_id,
                    status="error",
                    target=clean_domain,
                    risk_score=50,
                    risk_level=RiskLevelEnum.HIGH,
                )
                return res.model_dump()

            raw_cookies = fetch_res.get("cookies", [])
            effective_url = fetch_res.get("url")

            analyzed_items, observations, risk_score, risk_level, breakdown = evaluate_cookie_security_rules(
                raw_cookies=raw_cookies
            )

            result = CookieScanResult(
                module_id=self.module_id,
                status="completed",
                target=clean_domain,
                effective_url=effective_url,
                cookies_count=len(raw_cookies),
                risk_score=risk_score,
                risk_level=risk_level,
                analyzed_cookies=analyzed_items,
                raw_cookies=raw_cookies,
                security_observations=observations,
                score_breakdown=breakdown,
            )
            return result.model_dump()

        except Exception as exc:
            logger.error("CookieScanner error for target %s: %s", target, exc, exc_info=True)
            fallback = CookieScanResult(
                module_id=self.module_id,
                status="error",
                target=target,
                risk_score=50,
                risk_level=RiskLevelEnum.HIGH,
            )
            return fallback.model_dump()

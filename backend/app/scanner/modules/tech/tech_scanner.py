from typing import Any, Dict
from app.scanner.interfaces.module_interface import IScannerModule
from app.scanner.modules.tech.tech_models import RiskLevelEnum, TechScanResult
from app.scanner.modules.tech.utils import (
    analyze_technology_stack,
    fetch_page_tech_data_async,
)


class TechScanner(IScannerModule):
    """
    TechScanner Module
    Performs passive Layer 7 fingerprinting of web servers, application frameworks,
    CMS platforms, CDNs, and WAF providers based on HTTP headers, cookies, and meta signatures.
    """

    @property
    def module_id(self) -> str:
        return "tech"

    @property
    def name(self) -> str:
        return "Technology Stack Fingerprinting"

    async def run(self, target: str) -> Dict[str, Any]:
        clean_domain = target.strip().lower()

        # Remove http:// or https:// if provided
        if clean_domain.startswith("https://"):
            clean_domain = clean_domain[8:]
        elif clean_domain.startswith("http://"):
            clean_domain = clean_domain[7:]

        clean_domain = clean_domain.split("/")[0]

        try:
            fetch_res = await fetch_page_tech_data_async(clean_domain)

            if not fetch_res.get("ok", False):
                res = TechScanResult(
                    module_id=self.module_id,
                    status="error",
                    target=clean_domain,
                    risk_score=0,
                    risk_level=RiskLevelEnum.LOW,
                )
                return res.model_dump()

            headers = fetch_res.get("headers", {})
            cookies = fetch_res.get("cookies", [])
            body = fetch_res.get("body", "")
            effective_url = fetch_res.get("url")

            detected_tech, observations, risk_score, risk_level = analyze_technology_stack(
                headers=headers,
                cookies=cookies,
                body=body,
            )

            result = TechScanResult(
                module_id=self.module_id,
                status="completed",
                target=clean_domain,
                effective_url=effective_url,
                tech_count=len(detected_tech),
                risk_score=risk_score,
                risk_level=risk_level,
                detected_technologies=detected_tech,
                security_observations=observations,
            )
            return result.model_dump()

        except Exception:
            res = TechScanResult(
                module_id=self.module_id,
                status="error",
                target=clean_domain,
                risk_score=0,
                risk_level=RiskLevelEnum.LOW,
            )
            return res.model_dump()

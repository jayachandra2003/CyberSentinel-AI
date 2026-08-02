import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.scanner.modules.headers.headers_models import (
    HeaderAnalysisItem,
    HeaderStatusEnum,
    HeadersObservation,
    RiskLevelEnum,
)

logger = logging.getLogger(__name__)


def sanitise_domain(target: str) -> str:
    """Strips protocols, paths, ports, and whitespace from a target string."""
    if not target:
        return ""
    target = target.strip()
    target = re.sub(r"^https?://", "", target, flags=re.IGNORECASE)
    target = target.split("/")[0]
    target = target.split(":")[0]
    return target.lower()


async def fetch_headers_async(domain: str, timeout: float = 5.0) -> Dict[str, Any]:
    """
    Executes async HTTP/HTTPS GET request to fetch raw response headers.
    Attempts HTTPS first, falling back to HTTP if HTTPS fails.
    """
    clean = sanitise_domain(domain)
    if not clean:
        return {"ok": False, "error": "Invalid or empty domain target."}

    user_agent = "CyberSentinel-SecurityBot/1.0 (+https://cybersentinel.ai/bot)"
    headers_to_send = {"User-Agent": user_agent}

    client_timeout = httpx.Timeout(timeout, connect=3.0)

    # 1. Attempt HTTPS
    https_url = f"https://{clean}"
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=5,
            timeout=client_timeout,
            verify=False,  # Defensive inspection mode: proceed even if self-signed
        ) as client:
            resp = await client.get(https_url, headers=headers_to_send)
            raw = {k.lower(): str(v) for k, v in resp.headers.items()}
            return {
                "ok": True,
                "url": str(resp.url),
                "status_code": resp.status_code,
                "is_https": True,
                "raw_headers": raw,
            }
    except Exception as exc:
        logger.debug("HTTPS header fetch failed for %s: %s. Falling back to HTTP.", clean, exc)

    # 2. HTTP Fallback
    http_url = f"http://{clean}"
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=5,
            timeout=client_timeout,
        ) as client:
            resp = await client.get(http_url, headers=headers_to_send)
            raw = {k.lower(): str(v) for k, v in resp.headers.items()}
            return {
                "ok": True,
                "url": str(resp.url),
                "status_code": resp.status_code,
                "is_https": False,
                "raw_headers": raw,
            }
    except Exception as exc:
        logger.warning("HTTP header fetch failed for %s: %s", clean, exc)
        return {"ok": False, "error": f"Failed to connect to web server: {type(exc).__name__}: {str(exc)}"}


def analyze_security_headers(
    raw_headers: Dict[str, str], is_https: bool
) -> Tuple[List[HeaderAnalysisItem], List[HeadersObservation], int, RiskLevelEnum]:
    """
    Evaluates HTTP response headers against security best practice rules.
    Returns (analyzed_items, observations, risk_score, risk_level).
    """
    items: List[HeaderAnalysisItem] = []
    obs: List[HeadersObservation] = []
    risk_score = 0

    # Lowercase header lookup map
    headers = {k.lower(): v for k, v in raw_headers.items()}

    # 1. Strict-Transport-Security (HSTS)
    hsts_val = headers.get("strict-transport-security")
    if hsts_val:
        # Check max-age
        max_age_match = re.search(r"max-age=(\d+)", hsts_val, re.IGNORECASE)
        max_age = int(max_age_match.group(1)) if max_age_match else 0

        if max_age < 15768000:  # < 6 months
            items.append(
                HeaderAnalysisItem(
                    header_name="Strict-Transport-Security",
                    header_value=hsts_val,
                    status=HeaderStatusEnum.WEAK,
                    severity=RiskLevelEnum.MEDIUM,
                    title="HSTS Max-Age Too Short",
                    description=f"HSTS header present but max-age is only {max_age}s (< 6 months recommended).",
                    recommendation="Set HSTS max-age to at least 31536000 seconds (1 year) with includeSubDomains.",
                )
            )
            obs.append(
                HeadersObservation(
                    code="WEAK_HSTS_MAX_AGE",
                    severity=RiskLevelEnum.MEDIUM,
                    title="Short HSTS Duration",
                    description=f"HSTS duration ({max_age}s) is shorter than recommended 1 year minimum.",
                )
            )
            risk_score += 15
        else:
            items.append(
                HeaderAnalysisItem(
                    header_name="Strict-Transport-Security",
                    header_value=hsts_val,
                    status=HeaderStatusEnum.CONFIGURED,
                    severity=RiskLevelEnum.LOW,
                    title="HSTS Enforced",
                    description="Strict-Transport-Security header active with valid long-term max-age.",
                    recommendation="Maintain current HSTS configuration with includeSubDomains and preload.",
                )
            )
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="Strict-Transport-Security",
                header_value=None,
                status=HeaderStatusEnum.MISSING,
                severity=RiskLevelEnum.HIGH,
                title="Missing HSTS Header",
                description="Strict-Transport-Security header missing. Site is exposed to HTTP downgrade and SSL stripping attacks.",
                recommendation="Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to web server configuration.",
            )
        )
        obs.append(
            HeadersObservation(
                code="MISSING_HSTS",
                severity=RiskLevelEnum.HIGH,
                title="Missing Strict-Transport-Security (HSTS)",
                description="Web application does not enforce HSTS, leaving users vulnerable to SSL stripping attacks.",
            )
        )
        risk_score += 25

    # 2. Content-Security-Policy (CSP) & Report-Only
    csp_val = headers.get("content-security-policy")
    csp_ro_val = headers.get("content-security-policy-report-only")

    if csp_val:
        if "'unsafe-inline'" in csp_val or "'unsafe-eval'" in csp_val:
            items.append(
                HeaderAnalysisItem(
                    header_name="Content-Security-Policy",
                    header_value=csp_val,
                    status=HeaderStatusEnum.WEAK,
                    severity=RiskLevelEnum.MEDIUM,
                    title="Weak Directives in CSP",
                    description="CSP header contains unsafe directives ('unsafe-inline' or 'unsafe-eval').",
                    recommendation="Replace 'unsafe-inline' and 'unsafe-eval' with nonces or hashes for script execution.",
                )
            )
            obs.append(
                HeadersObservation(
                    code="WEAK_CSP_DIRECTIVES",
                    severity=RiskLevelEnum.MEDIUM,
                    title="Weak Content-Security-Policy Directives",
                    description="CSP contains unsafe-inline or unsafe-eval directives reducing XSS protection.",
                )
            )
            risk_score += 15
        else:
            items.append(
                HeaderAnalysisItem(
                    header_name="Content-Security-Policy",
                    header_value=csp_val,
                    status=HeaderStatusEnum.CONFIGURED,
                    severity=RiskLevelEnum.LOW,
                    title="Content Security Policy Active",
                    description="Valid Content-Security-Policy header restricts unauthorized script origins.",
                    recommendation="Regularly audit CSP directives and enforce report-uri / report-to monitoring.",
                )
            )
    elif csp_ro_val:
        items.append(
            HeaderAnalysisItem(
                header_name="Content-Security-Policy-Report-Only",
                header_value=csp_ro_val,
                status=HeaderStatusEnum.REPORT_ONLY,
                severity=RiskLevelEnum.MEDIUM,
                title="CSP Operating in Report-Only Mode",
                description="Content-Security-Policy-Report-Only header detected. Policy violations are reported to telemetry endpoints but not enforced by client browsers.",
                recommendation="Review violation telemetry logs and migrate Content-Security-Policy-Report-Only to an enforced Content-Security-Policy header.",
            )
        )
        obs.append(
            HeadersObservation(
                code="CSP_REPORT_ONLY",
                severity=RiskLevelEnum.MEDIUM,
                title="Content-Security-Policy Running in Report-Only Mode",
                description="CSP violations are monitored and logged to report endpoints but browser enforcement is not active.",
            )
        )
        risk_score += 10
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="Content-Security-Policy",
                header_value=None,
                status=HeaderStatusEnum.MISSING,
                severity=RiskLevelEnum.HIGH,
                title="Missing Content-Security-Policy",
                description="CSP header missing. Web page does not restrict resource loading or script execution origins.",
                recommendation="Implement a restrictive CSP policy restricting default-src, script-src, and object-src origins.",
            )
        )
        obs.append(
            HeadersObservation(
                code="MISSING_CSP",
                severity=RiskLevelEnum.HIGH,
                title="Missing Content-Security-Policy (CSP)",
                description="No CSP header detected. Application lacks browser-level defense against XSS data injection.",
            )
        )
        risk_score += 25

    # 3. X-Frame-Options
    xfo_val = headers.get("x-frame-options")
    if xfo_val:
        xfo_upper = xfo_val.upper().strip()
        if xfo_upper in ["DENY", "SAMEORIGIN"]:
            items.append(
                HeaderAnalysisItem(
                    header_name="X-Frame-Options",
                    header_value=xfo_val,
                    status=HeaderStatusEnum.CONFIGURED,
                    severity=RiskLevelEnum.LOW,
                    title="Clickjacking Protection Active",
                    description=f"X-Frame-Options set to {xfo_upper}, preventing unauthorized framing.",
                    recommendation="Maintain X-Frame-Options configuration alongside CSP frame-ancestors directive.",
                )
            )
        else:
            items.append(
                HeaderAnalysisItem(
                    header_name="X-Frame-Options",
                    header_value=xfo_val,
                    status=HeaderStatusEnum.WEAK,
                    severity=RiskLevelEnum.MEDIUM,
                    title="Weak X-Frame-Options Value",
                    description=f"X-Frame-Options value '{xfo_val}' is deprecated or permissive.",
                    recommendation="Set X-Frame-Options to DENY or SAMEORIGIN.",
                )
            )
            risk_score += 15
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="X-Frame-Options",
                header_value=None,
                status=HeaderStatusEnum.MISSING,
                severity=RiskLevelEnum.HIGH,
                title="Missing Clickjacking Defense (X-Frame-Options)",
                description="X-Frame-Options header missing. Page may be embedded inside malicious third-party iframes.",
                recommendation="Add 'X-Frame-Options: DENY' or 'SAMEORIGIN' to response headers.",
            )
        )
        obs.append(
            HeadersObservation(
                code="MISSING_X_FRAME_OPTIONS",
                severity=RiskLevelEnum.HIGH,
                title="Missing X-Frame-Options (Clickjacking Exposure)",
                description="No framing restrictions configured, exposing application to Clickjacking attacks.",
            )
        )
        risk_score += 20

    # 4. X-Content-Type-Options
    xcto_val = headers.get("x-content-type-options")
    if xcto_val and xcto_val.lower().strip() == "nosniff":
        items.append(
            HeaderAnalysisItem(
                header_name="X-Content-Type-Options",
                header_value=xcto_val,
                status=HeaderStatusEnum.CONFIGURED,
                severity=RiskLevelEnum.LOW,
                title="MIME-Sniffing Defense Active",
                description="X-Content-Type-Options set to nosniff, preventing MIME-type sniffing.",
                recommendation="Maintain 'X-Content-Type-Options: nosniff' header.",
            )
        )
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="X-Content-Type-Options",
                header_value=xcto_val,
                status=HeaderStatusEnum.MISSING if not xcto_val else HeaderStatusEnum.WEAK,
                severity=RiskLevelEnum.MEDIUM,
                title="Missing MIME-Sniffing Defense",
                description="X-Content-Type-Options header missing or invalid. Browsers may interpret non-script files as code.",
                recommendation="Add 'X-Content-Type-Options: nosniff' to web server response headers.",
            )
        )
        obs.append(
            HeadersObservation(
                code="MISSING_X_CONTENT_TYPE",
                severity=RiskLevelEnum.MEDIUM,
                title="Missing X-Content-Type-Options (MIME-Sniffing)",
                description="Browser MIME-sniffing protection disabled, allowing browsers to infer content types.",
            )
        )
        risk_score += 15

    # 5. Referrer-Policy
    ref_val = headers.get("referrer-policy")
    if ref_val:
        items.append(
            HeaderAnalysisItem(
                header_name="Referrer-Policy",
                header_value=ref_val,
                status=HeaderStatusEnum.CONFIGURED,
                severity=RiskLevelEnum.LOW,
                title="Referrer Policy Configured",
                description=f"Referrer-Policy header set to '{ref_val}'.",
                recommendation="Ensure Referrer-Policy is set to strict-origin-when-cross-origin or no-referrer.",
            )
        )
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="Referrer-Policy",
                header_value=None,
                status=HeaderStatusEnum.MISSING,
                severity=RiskLevelEnum.MEDIUM,
                title="Missing Referrer Policy",
                description="Referrer-Policy header missing. Browsers default to sending full URL in Referer headers.",
                recommendation="Add 'Referrer-Policy: strict-origin-when-cross-origin' to prevent URL path leakage.",
            )
        )
        obs.append(
            HeadersObservation(
                code="MISSING_REFERRER_POLICY",
                severity=RiskLevelEnum.MEDIUM,
                title="Missing Referrer-Policy",
                description="Referrer policy omitted, allowing potential URL path and query token disclosure.",
            )
        )
        risk_score += 10

    # 6. Permissions-Policy
    perm_val = headers.get("permissions-policy") or headers.get("feature-policy")
    if perm_val:
        items.append(
            HeaderAnalysisItem(
                header_name="Permissions-Policy",
                header_value=perm_val,
                status=HeaderStatusEnum.CONFIGURED,
                severity=RiskLevelEnum.LOW,
                title="Permissions Policy Configured",
                description="Permissions-Policy header restricts browser feature access for third-party contexts.",
                recommendation="Maintain explicit Permissions-Policy directives for camera, microphone, and geolocation.",
            )
        )
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="Permissions-Policy",
                header_value=None,
                status=HeaderStatusEnum.MISSING,
                severity=RiskLevelEnum.LOW,
                title="Missing Permissions-Policy",
                description="Permissions-Policy header missing. Browser hardware features are unrestricted.",
                recommendation="Add 'Permissions-Policy: camera=(), microphone=(), geolocation=()' to restrict device APIs.",
            )
        )
        risk_score += 5

    # 7. Cross-Origin-Opener-Policy (COOP)
    coop_val = headers.get("cross-origin-opener-policy")
    if coop_val:
        items.append(
            HeaderAnalysisItem(
                header_name="Cross-Origin-Opener-Policy",
                header_value=coop_val,
                status=HeaderStatusEnum.CONFIGURED,
                severity=RiskLevelEnum.LOW,
                title="Cross-Origin Isolation Active (COOP)",
                description=f"COOP header configured as '{coop_val}'.",
                recommendation="Maintain COOP configuration for cross-origin isolation.",
            )
        )
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="Cross-Origin-Opener-Policy",
                header_value=None,
                status=HeaderStatusEnum.MISSING,
                severity=RiskLevelEnum.LOW,
                title="Missing Cross-Origin-Opener-Policy (COOP)",
                description="COOP header missing. Top-level window context is shared across origins.",
                recommendation="Set 'Cross-Origin-Opener-Policy: same-origin' for process isolation.",
            )
        )
        risk_score += 5

    # 8. Server Information Disclosure
    server_val = headers.get("server")
    if server_val:
        has_version = bool(re.search(r"\d+\.\d+", server_val))
        if has_version:
            items.append(
                HeaderAnalysisItem(
                    header_name="Server",
                    header_value=server_val,
                    status=HeaderStatusEnum.WEAK,
                    severity=RiskLevelEnum.LOW,
                    title="Server Version Disclosed",
                    description=f"Server header exposes exact web server version: '{server_val}'.",
                    recommendation="Configure web server to suppress or obfuscate version strings in Server headers.",
                )
            )
            obs.append(
                HeadersObservation(
                    code="SERVER_VERSION_LEAK",
                    severity=RiskLevelEnum.LOW,
                    title="Web Server Version Information Disclosure",
                    description=f"Server header discloses software version: '{server_val}'.",
                )
            )
            risk_score += 10
        else:
            items.append(
                HeaderAnalysisItem(
                    header_name="Server",
                    header_value=server_val,
                    status=HeaderStatusEnum.INFO,
                    severity=RiskLevelEnum.LOW,
                    title="Generic Server Header Disclosed",
                    description=f"Server header returns generic name: '{server_val}'.",
                    recommendation="Optionally suppress Server header entirely for defense-in-depth.",
                )
            )
    else:
        items.append(
            HeaderAnalysisItem(
                header_name="Server",
                header_value=None,
                status=HeaderStatusEnum.CONFIGURED,
                severity=RiskLevelEnum.LOW,
                title="Server Header Suppressed",
                description="Server header is hidden, preventing automated web server software identification.",
                recommendation="Maintain Server header suppression.",
            )
        )

    # 9. X-Powered-By Information Disclosure
    powered_val = headers.get("x-powered-by")
    if powered_val:
        items.append(
            HeaderAnalysisItem(
                header_name="X-Powered-By",
                header_value=powered_val,
                status=HeaderStatusEnum.WEAK,
                severity=RiskLevelEnum.LOW,
                title="Backend Framework Disclosed",
                description=f"X-Powered-By header discloses backend framework: '{powered_val}'.",
                recommendation="Remove X-Powered-By header in backend framework configuration.",
            )
        )
        obs.append(
            HeadersObservation(
                code="FRAMEWORK_LEAK",
                severity=RiskLevelEnum.LOW,
                title="Backend Framework Information Disclosure",
                description=f"X-Powered-By header discloses framework: '{powered_val}'.",
            )
        )
        risk_score += 10

    if not obs:
        obs.append(
            HeadersObservation(
                code="HEADERS_CONFIG_HEALTHY",
                severity=RiskLevelEnum.LOW,
                title="HTTP Security Posture Healthy",
                description="Core defensive HTTP security headers (HSTS, CSP, X-Frame-Options) are configured correctly.",
            )
        )

    # Bound risk score (0-100)
    risk_score = min(risk_score, 100)

    # Determine risk level
    if risk_score >= 80:
        risk_level = RiskLevelEnum.CRITICAL
    elif risk_score >= 50:
        risk_level = RiskLevelEnum.HIGH
    elif risk_score >= 20:
        risk_level = RiskLevelEnum.MEDIUM
    else:
        risk_level = RiskLevelEnum.LOW

    return items, obs, risk_score, risk_level

from http.cookies import SimpleCookie
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.scanner.modules.cookies.cookie_models import (
    CookieAnalysisItem,
    CookieObservation,
    CookieStatusEnum,
    RiskLevelEnum,
    ScoreBreakdownItem,
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


def classify_cookie_category(cookie_name: str) -> Tuple[str, str, float]:
    """
    Classifies a cookie into sensitivity tiers using regex pattern matching.
    Returns (category_key, category_label, weight).
    """
    if not cookie_name:
        return "unknown", "Unknown", 0.5

    name_lower = cookie_name.lower()

    # 1. Authentication Cookies (Weight: 1.0)
    auth_patterns = [
        r"sessionid", r"phpsessid", r"jsessionid", r"asp\.net_sessionid",
        r"auth_token", r"access_token", r"jwt", r"\bsid\b", r"bearer", r"sec_token",
        r"authtoken", r"user_session", r"remember_token"
    ]
    if any(re.search(pat, name_lower) for pat in auth_patterns):
        return "auth", "Authentication", 1.0

    # 2. Session / CSRF Cookies (Weight: 0.8)
    session_patterns = [
        r"csrf", r"xsrf", r"\bsession\b", r"connect\.sid", r"rails_session", r"laravel_session"
    ]
    if any(re.search(pat, name_lower) for pat in session_patterns):
        return "session", "Session & CSRF", 0.8

    # 3. Tracking & Marketing Cookies (Weight: 0.4)
    tracking_patterns = [
        r"_fbp", r"gcl_", r"_uetsid", r"_uetvid", r"marketing", r"\bads\b", r"_rdt_uuid"
    ]
    if any(re.search(pat, name_lower) for pat in tracking_patterns):
        return "tracking", "Tracking & Ads", 0.4

    # 4. Analytics Cookies (Weight: 0.2)
    analytics_patterns = [
        r"_ga", r"_gid", r"_gat", r"_pk_id", r"_pk_ses", r"amplitude_", r"_parsely", r"_hj"
    ]
    if any(re.search(pat, name_lower) for pat in analytics_patterns):
        return "analytics", "Analytics", 0.2

    # 5. Functional & Preferences Cookies (Weight: 0.1)
    functional_patterns = [
        r"theme", r"lang", r"language", r"locale", r"currency", r"timezone", r"consent", r"cookie_notice"
    ]
    if any(re.search(pat, name_lower) for pat in functional_patterns):
        return "functional", "Functional", 0.1

    # 6. Fallback Unknown Cookies (Weight: 0.5)
    return "unknown", "Unknown", 0.5


async def fetch_cookies_async(domain: str, timeout: float = 5.0) -> Dict[str, Any]:
    """
    Executes async HTTP/HTTPS request to capture Set-Cookie response headers.
    Uses default secure TLS verification (no verify=False to comply with Bandit B501).
    Attempts HTTPS first, falling back to HTTP if HTTPS fails.
    """
    clean = sanitise_domain(domain)
    if not clean:
        return {"ok": False, "error": "Invalid or empty domain target."}

    user_agent = "CyberSentinel-SecurityBot/1.0 (+https://cybersentinel.ai/bot)"
    headers_to_send = {"User-Agent": user_agent}

    client_timeout = httpx.Timeout(timeout, connect=3.0)
    raw_cookies_list: List[Dict[str, Any]] = []

    # 1. Attempt HTTPS
    https_url = f"https://{clean}"
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=5,
            timeout=client_timeout,
        ) as client:
            resp = await client.get(https_url, headers=headers_to_send)
            
            responses = list(resp.history) + [resp]
            for r in responses:
                for header_name, header_val in r.headers.multi_items():
                    if header_name.lower() == "set-cookie":
                        parsed = parse_single_cookie_header(header_val, clean)
                        if parsed:
                            raw_cookies_list.append(parsed)

            return {
                "ok": True,
                "url": str(resp.url),
                "is_https": True,
                "cookies": raw_cookies_list,
            }
    except Exception as exc:
        logger.debug("HTTPS cookie fetch failed for %s: %s. Falling back to HTTP.", clean, exc)

    # 2. HTTP Fallback
    http_url = f"http://{clean}"
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=5,
            timeout=client_timeout,
        ) as client:
            resp = await client.get(http_url, headers=headers_to_send)
            
            responses = list(resp.history) + [resp]
            for r in responses:
                for header_name, header_val in r.headers.multi_items():
                    if header_name.lower() == "set-cookie":
                        parsed = parse_single_cookie_header(header_val, clean)
                        if parsed:
                            raw_cookies_list.append(parsed)

            return {
                "ok": True,
                "url": str(resp.url),
                "is_https": False,
                "cookies": raw_cookies_list,
            }
    except Exception as exc:
        logger.warning("HTTP cookie fetch failed for %s: %s", clean, exc)
        return {"ok": False, "error": f"Failed to connect to web server: {type(exc).__name__}: {str(exc)}"}


def parse_single_cookie_header(header_val: str, target_domain: str) -> Optional[Dict[str, Any]]:
    """Parses a single Set-Cookie header string into structured attributes."""
    if not header_val or not header_val.strip():
        return None

    try:
        cookie = SimpleCookie()
        cookie.load(header_val)
        
        for name, morsel in cookie.items():
            samesite_match = re.search(r"SameSite=([a-zA-Z]+)", header_val, re.IGNORECASE)
            samesite_val = samesite_match.group(1) if samesite_match else None
            partitioned = bool(re.search(r"\bPartitioned\b", header_val, re.IGNORECASE))

            return {
                "name": name,
                "value": morsel.value,
                "domain": morsel["domain"] or None,
                "path": morsel["path"] or "/",
                "is_secure": bool(morsel["secure"]),
                "is_httponly": bool(morsel["httponly"]),
                "samesite": samesite_val,
                "is_host_prefix": name.startswith("__Host-"),
                "is_secure_prefix": name.startswith("__Secure-"),
                "is_partitioned": partitioned,
                "max_age": int(morsel["max-age"]) if morsel["max-age"].isdigit() else None,
                "expires": morsel["expires"] or None,
                "raw_header": header_val,
            }
    except Exception as exc:
        logger.debug("SimpleCookie parse error on '%s': %s", header_val, exc)
        parts = [p.strip() for p in header_val.split(";")]
        if not parts or "=" not in parts[0]:
            return None
        
        name_val = parts[0].split("=", 1)
        c_name = name_val[0].strip()
        c_val = name_val[1].strip() if len(name_val) > 1 else ""

        is_sec = any(p.lower() == "secure" for p in parts[1:])
        is_httponly = any(p.lower() == "httponly" for p in parts[1:])
        
        ss_val = None
        dom_val = None
        path_val = "/"
        max_age_val = None

        for p in parts[1:]:
            if "=" in p:
                k, v = p.split("=", 1)
                k_low = k.strip().lower()
                v_str = v.strip()
                if k_low == "samesite":
                    ss_val = v_str
                elif k_low == "domain":
                    dom_val = v_str
                elif k_low == "path":
                    path_val = v_str
                elif k_low == "max-age" and v_str.isdigit():
                    max_age_val = int(v_str)

        return {
            "name": c_name,
            "value": c_val,
            "domain": dom_val,
            "path": path_val,
            "is_secure": is_sec,
            "is_httponly": is_httponly,
            "samesite": ss_val,
            "is_host_prefix": c_name.startswith("__Host-"),
            "is_secure_prefix": c_name.startswith("__Secure-"),
            "is_partitioned": any(p.lower() == "partitioned" for p in parts[1:]),
            "max_age": max_age_val,
            "expires": None,
            "raw_header": header_val,
        }
    return None


def evaluate_cookie_security_rules(
    raw_cookies: List[Dict[str, Any]]
) -> Tuple[List[CookieAnalysisItem], List[CookieObservation], int, RiskLevelEnum, List[ScoreBreakdownItem]]:
    """
    Evaluates analyzed cookie items against weighted security best practice rules.
    Returns (analyzed_items, observations, risk_score, risk_level, score_breakdown).
    """
    items: List[CookieAnalysisItem] = []
    obs: List[CookieObservation] = []
    breakdown: List[ScoreBreakdownItem] = []
    risk_score = 0

    if not raw_cookies:
        obs.append(
            CookieObservation(
                code="CK-000",
                severity=RiskLevelEnum.LOW,
                title="No Response Cookies Issued",
                description="Target web server issued zero Set-Cookie response headers.",
            )
        )
        return items, obs, 0, RiskLevelEnum.LOW, breakdown

    for c in raw_cookies:
        c_name = c.get("name", "unknown")
        c_val = c.get("value", "")
        c_domain = c.get("domain")
        c_path = c.get("path", "/")
        is_sec = c.get("is_secure", False)
        is_httponly = c.get("is_httponly", False)
        samesite = c.get("samesite")
        is_host_prefix = c.get("is_host_prefix", False)
        is_secure_prefix = c.get("is_secure_prefix", False)
        is_partitioned = c.get("is_partitioned", False)
        max_age = c.get("max_age")
        expires = c.get("expires")

        cat_key, cat_label, weight = classify_cookie_category(c_name)
        is_sensitive = cat_key in ["auth", "session"]

        cookie_issues: List[str] = []
        item_severity = RiskLevelEnum.LOW
        item_status = CookieStatusEnum.CONFIGURED
        primary_finding_id: Optional[str] = None

        # Rule 1: CK-001 Missing Secure Flag
        if not is_sec:
            cookie_issues.append("Missing Secure flag")
            base_pts = 25
            pts = max(1, round(base_pts * weight))
            
            if is_sensitive:
                item_severity = RiskLevelEnum.HIGH
            else:
                item_severity = RiskLevelEnum.MEDIUM if weight >= 0.4 else RiskLevelEnum.LOW

            item_status = CookieStatusEnum.WEAK
            primary_finding_id = "CK-001"
            
            obs.append(
                CookieObservation(
                    code="CK-001",
                    severity=item_severity,
                    title=f"Cookie Missing Secure Flag ('{c_name}')",
                    description=f"Cookie '{c_name}' ({cat_label}) lacks Secure flag, enabling plaintext HTTP transmission.",
                )
            )
            risk_score += pts
            breakdown.append(
                ScoreBreakdownItem(
                    label=f"Missing Secure flag on '{c_name}' ({cat_label})",
                    points=pts,
                    category=cat_key,
                )
            )

        # Rule 2: CK-002 Missing HttpOnly Flag
        if not is_httponly:
            cookie_issues.append("Missing HttpOnly flag")
            base_pts = 25
            pts = max(1, round(base_pts * weight))

            if is_sensitive:
                httponly_sev = RiskLevelEnum.HIGH
                if item_severity != RiskLevelEnum.CRITICAL:
                    item_severity = RiskLevelEnum.HIGH
            else:
                # Contextual false positive reduction for Analytics/Functional cookies
                httponly_sev = RiskLevelEnum.LOW if cat_key in ["analytics", "functional"] else RiskLevelEnum.MEDIUM
                if item_severity == RiskLevelEnum.LOW:
                    item_severity = httponly_sev

            item_status = CookieStatusEnum.WEAK
            if not primary_finding_id:
                primary_finding_id = "CK-002"

            obs.append(
                CookieObservation(
                    code="CK-002",
                    severity=httponly_sev,
                    title=f"Cookie Missing HttpOnly Flag ('{c_name}')",
                    description=f"Cookie '{c_name}' ({cat_label}) lacks HttpOnly flag, allowing client-side JavaScript access.",
                )
            )
            risk_score += pts
            breakdown.append(
                ScoreBreakdownItem(
                    label=f"Missing HttpOnly flag on '{c_name}' ({cat_label})",
                    points=pts,
                    category=cat_key,
                )
            )

        # Rule 3: CK-003 / CK-004 SameSite Attribute
        if not samesite:
            cookie_issues.append("Missing SameSite attribute")
            base_pts = 15
            pts = max(1, round(base_pts * weight))

            ss_sev = RiskLevelEnum.HIGH if is_sensitive else RiskLevelEnum.MEDIUM
            if item_severity == RiskLevelEnum.LOW:
                item_severity = ss_sev
            item_status = CookieStatusEnum.WEAK
            if not primary_finding_id:
                primary_finding_id = "CK-003"

            obs.append(
                CookieObservation(
                    code="CK-003",
                    severity=ss_sev,
                    title=f"Cookie Missing SameSite Policy ('{c_name}')",
                    description=f"Cookie '{c_name}' ({cat_label}) omits SameSite attribute, exposing session to CSRF risks.",
                )
            )
            risk_score += pts
            breakdown.append(
                ScoreBreakdownItem(
                    label=f"Missing SameSite attribute on '{c_name}' ({cat_label})",
                    points=pts,
                    category=cat_key,
                )
            )
        elif samesite.lower() == "none" and not is_sec:
            cookie_issues.append("SameSite=None without Secure flag")
            base_pts = 20
            pts = max(1, round(base_pts * weight))

            item_severity = RiskLevelEnum.HIGH
            item_status = CookieStatusEnum.WEAK
            if not primary_finding_id:
                primary_finding_id = "CK-004"

            obs.append(
                CookieObservation(
                    code="CK-004",
                    severity=RiskLevelEnum.HIGH,
                    title=f"Insecure SameSite=None on '{c_name}'",
                    description=f"Cookie '{c_name}' sets SameSite=None without Secure flag, rejected by modern browsers.",
                )
            )
            risk_score += pts
            breakdown.append(
                ScoreBreakdownItem(
                    label=f"Insecure SameSite=None on '{c_name}' ({cat_label})",
                    points=pts,
                    category=cat_key,
                )
            )

        # Rule 4: CK-006 Cookie Prefixes
        if is_host_prefix:
            if not is_sec or c_path != "/" or c_domain is not None:
                cookie_issues.append("Invalid __Host- prefix contract")
                base_pts = 20
                pts = max(1, round(base_pts * weight))

                item_severity = RiskLevelEnum.HIGH
                item_status = CookieStatusEnum.WEAK
                if not primary_finding_id:
                    primary_finding_id = "CK-006"

                obs.append(
                    CookieObservation(
                        code="CK-006",
                        severity=RiskLevelEnum.HIGH,
                        title=f"Invalid __Host- Prefix Contract on '{c_name}'",
                        description=f"__Host- prefix cookie '{c_name}' must enforce Secure flag, Path=/, and omit Domain.",
                    )
                )
                risk_score += pts
                breakdown.append(
                    ScoreBreakdownItem(
                        label=f"Invalid __Host- prefix on '{c_name}' ({cat_label})",
                        points=pts,
                        category=cat_key,
                    )
                )

        if is_secure_prefix and not is_sec:
            cookie_issues.append("Invalid __Secure- prefix contract")
            base_pts = 15
            pts = max(1, round(base_pts * weight))

            if item_severity == RiskLevelEnum.LOW:
                item_severity = RiskLevelEnum.MEDIUM
            item_status = CookieStatusEnum.WEAK
            if not primary_finding_id:
                primary_finding_id = "CK-006"

            obs.append(
                CookieObservation(
                    code="CK-006",
                    severity=RiskLevelEnum.MEDIUM,
                    title=f"Invalid __Secure- Prefix Contract on '{c_name}'",
                    description=f"__Secure- prefix cookie '{c_name}' must enforce Secure flag.",
                )
            )
            risk_score += pts
            breakdown.append(
                ScoreBreakdownItem(
                    label=f"Invalid __Secure- prefix on '{c_name}' ({cat_label})",
                    points=pts,
                    category=cat_key,
                )
            )

        # Rule 5: CK-005 Overly Permissive Domain
        if c_domain and c_domain.startswith("."):
            cookie_issues.append("Wildcard parent domain scoping")
            base_pts = 10
            pts = max(1, round(base_pts * weight))

            if item_severity == RiskLevelEnum.LOW:
                item_severity = RiskLevelEnum.MEDIUM
            if not primary_finding_id:
                primary_finding_id = "CK-005"

            obs.append(
                CookieObservation(
                    code="CK-005",
                    severity=RiskLevelEnum.MEDIUM,
                    title=f"Permissive Domain Scoping on '{c_name}'",
                    description=f"Cookie '{c_name}' uses wildcard Domain='{c_domain}', exposing cookie to all subdomains.",
                )
            )
            risk_score += pts
            breakdown.append(
                ScoreBreakdownItem(
                    label=f"Wildcard domain on '{c_name}' ({cat_label})",
                    points=pts,
                    category=cat_key,
                )
            )

        # Precise recommendations based on missing flags
        rec_parts = []
        if not is_sec:
            rec_parts.append("Append 'Secure' flag to enforce HTTPS transmission.")
        if not is_httponly:
            rec_parts.append("Append 'HttpOnly' flag to block JavaScript read access.")
        if not samesite:
            rec_parts.append("Set 'SameSite=Lax' (or 'Strict') to mitigate CSRF.")
        if c_domain and c_domain.startswith("."):
            rec_parts.append("Omit 'Domain' attribute to enforce Host-only cookie scoping.")

        if rec_parts:
            title = f"Cookie Security Gaps in '{c_name}' ({cat_label})"
            desc = f"Cookie '{c_name}' ({cat_label}) exhibits posture weaknesses: {', '.join(cookie_issues)}."
            rec = " ".join(rec_parts)
        else:
            title = f"Cookie '{c_name}' ({cat_label}) Configured Securely"
            desc = f"Cookie '{c_name}' enforces Secure, HttpOnly, and valid SameSite attributes."
            rec = "Maintain current secure cookie attribute configuration."

        items.append(
            CookieAnalysisItem(
                name=c_name,
                value=c_val,
                domain=c_domain,
                path=c_path,
                is_secure=is_sec,
                is_httponly=is_httponly,
                samesite=samesite,
                is_host_prefix=is_host_prefix,
                is_secure_prefix=is_secure_prefix,
                is_partitioned=is_partitioned,
                max_age=max_age,
                expires=expires,
                category=cat_key,
                category_label=cat_label,
                weight=weight,
                finding_id=primary_finding_id,
                status=item_status,
                severity=item_severity,
                title=title,
                description=desc,
                recommendation=rec,
            )
        )

    if not obs:
        obs.append(
            CookieObservation(
                code="CK-000",
                severity=RiskLevelEnum.LOW,
                title="Cookie Security Posture Healthy",
                description="All HTTP response cookies enforce Secure, HttpOnly, and SameSite protection flags.",
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

    return items, obs, risk_score, risk_level, breakdown

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.scanner.modules.tech.tech_models import (
    DetectedTechnology,
    RiskLevelEnum,
    TechCategoryEnum,
    TechObservation,
)


def extract_version_from_string(text: str, pattern: str) -> Optional[str]:
    match = re.search(pattern, text, re.IGNORECASE)
    if match and match.groups():
        return match.group(1)
    return None


def calculate_confidence(evidence_weights: List[int]) -> int:
    return min(100, sum(evidence_weights))


async def fetch_page_tech_data_async(domain: str) -> Dict[str, Any]:
    """
    Performs a non-blocking HTTP GET request using httpx with secure TLS verification (verify=True).
    Captures headers, cookies, and initial HTML response body snippet.
    """
    url = f"https://{domain}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CyberSentinel-AI-Recon/1.6"
    }

    try:
        async with httpx.AsyncClient(
            verify=True, follow_redirects=True, timeout=10.0
        ) as client:
            resp = await client.get(url, headers=headers)
            body_snippet = resp.text[:102400]  # First 100 KB only
            
            raw_cookies = []
            for k, v in resp.cookies.items():
                raw_cookies.append({"name": k, "value": v})

            return {
                "ok": True,
                "status_code": resp.status_code,
                "url": str(resp.url),
                "headers": dict(resp.headers),
                "cookies": raw_cookies,
                "body": body_snippet,
            }
    except Exception as exc:
        # Fallback to http if https fails
        try:
            http_url = f"http://{domain}"
            async with httpx.AsyncClient(
                verify=True, follow_redirects=True, timeout=10.0
            ) as client:
                resp = await client.get(http_url, headers=headers)
                body_snippet = resp.text[:102400]
                raw_cookies = [{"name": k, "value": v} for k, v in resp.cookies.items()]
                return {
                    "ok": True,
                    "status_code": resp.status_code,
                    "url": str(resp.url),
                    "headers": dict(resp.headers),
                    "cookies": raw_cookies,
                    "body": body_snippet,
                }
        except Exception as inner_exc:
            return {
                "ok": False,
                "error": f"HTTP request failed: {str(inner_exc)}",
            }


def analyze_technology_stack(
    headers: Dict[str, str],
    cookies: List[Dict[str, Any]],
    body: str,
) -> Tuple[List[DetectedTechnology], List[TechObservation], int, RiskLevelEnum]:
    """
    Passively evaluates headers, cookies, and HTML tags against signature catalog.
    Returns: (detected_technologies, observations, risk_score, risk_level)
    """
    detected_map: Dict[str, DetectedTechnology] = {}
    observations: List[TechObservation] = []

    lower_headers = {k.lower(): str(v) for k, v in headers.items()}
    server_hdr = lower_headers.get("server", "")
    powered_by = lower_headers.get("x-powered-by", "")
    cookie_names = [c.get("name", "") for c in cookies]

    # 1. Web Servers
    if "nginx" in server_hdr.lower():
        ver = extract_version_from_string(server_hdr, r"nginx/([\d.]+)")
        detected_map["Nginx"] = DetectedTechnology(
            name="Nginx",
            category=TechCategoryEnum.SERVER,
            category_label="Web Server",
            version=ver,
            confidence=90 if ver else 75,
            evidence=f"Server: {server_hdr}",
            description="High-performance asynchronous web server and reverse proxy.",
        )
    elif "apache" in server_hdr.lower():
        ver = extract_version_from_string(server_hdr, r"Apache/([\d.]+)")
        detected_map["Apache"] = DetectedTechnology(
            name="Apache",
            category=TechCategoryEnum.SERVER,
            category_label="Web Server",
            version=ver,
            confidence=90 if ver else 75,
            evidence=f"Server: {server_hdr}",
            description="Open-source HTTP server daemon.",
        )
    elif "microsoft-iis" in server_hdr.lower():
        ver = extract_version_from_string(server_hdr, r"Microsoft-IIS/([\d.]+)")
        detected_map["Microsoft-IIS"] = DetectedTechnology(
            name="Microsoft-IIS",
            category=TechCategoryEnum.SERVER,
            category_label="Web Server",
            version=ver,
            confidence=90 if ver else 75,
            evidence=f"Server: {server_hdr}",
            description="Microsoft Windows Internet Information Services web server.",
        )
    elif "caddy" in server_hdr.lower():
        ver = extract_version_from_string(server_hdr, r"Caddy/([\d.]+)")
        detected_map["Caddy"] = DetectedTechnology(
            name="Caddy",
            category=TechCategoryEnum.SERVER,
            category_label="Web Server",
            version=ver,
            confidence=90 if ver else 75,
            evidence=f"Server: {server_hdr}",
            description="Modern open-source web server with automatic HTTPS.",
        )
    elif "cloudflare" in server_hdr.lower():
        detected_map["Cloudflare Server"] = DetectedTechnology(
            name="Cloudflare Server",
            category=TechCategoryEnum.SERVER,
            category_label="Web Server",
            version=None,
            confidence=80,
            evidence=f"Server: {server_hdr}",
            description="Cloudflare edge web server proxy.",
        )

    # 2. Frameworks
    if "next.js" in powered_by.lower() or "/_next/static/" in body:
        ver = extract_version_from_string(powered_by, r"Next\.js\s*([\d.]+)")
        detected_map["Next.js"] = DetectedTechnology(
            name="Next.js",
            category=TechCategoryEnum.FRAMEWORK,
            category_label="Web Framework",
            version=ver,
            confidence=95 if powered_by else 80,
            evidence=f"X-Powered-By: {powered_by}" if powered_by else "Script path: /_next/static/",
            description="React-based full-stack web application framework.",
        )

    if "express" in powered_by.lower():
        detected_map["Express"] = DetectedTechnology(
            name="Express",
            category=TechCategoryEnum.FRAMEWORK,
            category_label="Web Framework",
            version=None,
            confidence=85,
            evidence=f"X-Powered-By: {powered_by}",
            description="Fast, unopinionated Node.js web application framework.",
        )

    if any(c in cookie_names for c in ["PHPSESSID"]) or "php" in powered_by.lower():
        ver = extract_version_from_string(powered_by, r"PHP/([\d.]+)")
        detected_map["PHP"] = DetectedTechnology(
            name="PHP",
            category=TechCategoryEnum.FRAMEWORK,
            category_label="Programming Language",
            version=ver,
            confidence=90 if ver else 80,
            evidence=f"X-Powered-By: {powered_by}" if powered_by else "Cookie: PHPSESSID",
            description="Server-side scripting language designed for web development.",
        )

    if any(c in cookie_names for c in ["laravel_session", "XSRF-TOKEN"]):
        detected_map["Laravel"] = DetectedTechnology(
            name="Laravel",
            category=TechCategoryEnum.FRAMEWORK,
            category_label="Web Framework",
            version=None,
            confidence=85,
            evidence="Cookie signature: laravel_session",
            description="PHP web framework with expressive syntax.",
        )

    if any(c in cookie_names for c in ["django_language", "csrftoken"]):
        detected_map["Django"] = DetectedTechnology(
            name="Django",
            category=TechCategoryEnum.FRAMEWORK,
            category_label="Web Framework",
            version=None,
            confidence=80,
            evidence="Cookie signature: csrftoken / django_language",
            description="High-level Python web framework encouraging rapid development.",
        )

    if "react" in body.lower() or "data-reactroot" in body:
        detected_map["React"] = DetectedTechnology(
            name="React",
            category=TechCategoryEnum.FRAMEWORK,
            category_label="Frontend Library",
            version=None,
            confidence=75,
            evidence="DOM Attribute: data-reactroot",
            description="JavaScript library for building user interfaces.",
        )

    # 3. CMS Platforms
    meta_gen = extract_version_from_string(body, r'<meta\s+name=["\']generator["\']\s+content=["\']([^"\']+)["\']')
    if meta_gen and "wordpress" in meta_gen.lower():
        ver = extract_version_from_string(meta_gen, r"WordPress\s*([\d.]+)")
        detected_map["WordPress"] = DetectedTechnology(
            name="WordPress",
            category=TechCategoryEnum.CMS,
            category_label="CMS",
            version=ver,
            confidence=95,
            evidence=f'<meta name="generator" content="{meta_gen}">',
            description="Popular open-source Content Management System.",
        )
    elif "/wp-content/" in body or "/wp-includes/" in body:
        detected_map["WordPress"] = DetectedTechnology(
            name="WordPress",
            category=TechCategoryEnum.CMS,
            category_label="CMS",
            version=None,
            confidence=85,
            evidence="Path artifact: /wp-content/",
            description="Popular open-source Content Management System.",
        )

    if meta_gen and "drupal" in meta_gen.lower():
        ver = extract_version_from_string(meta_gen, r"Drupal\s*([\d.]+)")
        detected_map["Drupal"] = DetectedTechnology(
            name="Drupal",
            category=TechCategoryEnum.CMS,
            category_label="CMS",
            version=ver,
            confidence=95,
            evidence=f'<meta name="generator" content="{meta_gen}">',
            description="Enterprise open-source CMS platform.",
        )

    # 4. CDN & WAF Providers
    if "cf-ray" in lower_headers or "cloudflare" in server_hdr.lower():
        detected_map["Cloudflare"] = DetectedTechnology(
            name="Cloudflare",
            category=TechCategoryEnum.CDN,
            category_label="CDN / WAF",
            version=None,
            confidence=95,
            evidence=f"Header: CF-RAY ({lower_headers.get('cf-ray', 'present')})",
            description="Global Content Delivery Network and DDoS Mitigation WAF.",
        )

    if "x-served-by" in lower_headers or "fastly" in lower_headers.get("via", "").lower():
        detected_map["Fastly"] = DetectedTechnology(
            name="Fastly",
            category=TechCategoryEnum.CDN,
            category_label="CDN",
            version=None,
            confidence=90,
            evidence=f"Header: Via ({lower_headers.get('via', 'Fastly')})",
            description="Edge cloud platform and CDN provider.",
        )

    if "x-datadome" in lower_headers or "datadome" in lower_headers.get("set-cookie", "").lower():
        detected_map["DataDome WAF"] = DetectedTechnology(
            name="DataDome WAF",
            category=TechCategoryEnum.WAF,
            category_label="Bot Detection / WAF",
            version=None,
            confidence=95,
            evidence="Header signature: X-DataDome",
            description="AI-driven bot protection and web application security solution.",
        )

    tech_list = list(detected_map.values())
    risk_score = 0

    # Risk & Security Observations
    if server_hdr and re.search(r"[\d.]+", server_hdr):
        risk_score += 15
        observations.append(
            TechObservation(
                code="TCK-001",
                severity=RiskLevelEnum.LOW,
                title="Detailed Server Version Disclosure",
                description=f"The web server discloses precise software version details in HTTP headers ('Server: {server_hdr}'). Disclosing server versions assists attackers in identifying version-specific CVE vulnerabilities.",
            )
        )

    if powered_by:
        risk_score += 15
        observations.append(
            TechObservation(
                code="TCK-002",
                severity=RiskLevelEnum.LOW,
                title="X-Powered-By Banner Disclosure",
                description=f"The application exposes underlying technology framework signatures ('X-Powered-By: {powered_by}'). Remove X-Powered-By headers to harden server reconnaissance posture.",
            )
        )

    if len(tech_list) == 0:
        observations.append(
            TechObservation(
                code="TCK-000",
                severity=RiskLevelEnum.LOW,
                title="Minimal Technology Banner Footprint",
                description="No overt framework or web server version banners were disclosed in response headers. Server fingerprinting posture is well-hardened.",
            )
        )

    risk_score = min(100, risk_score)
    risk_level = RiskLevelEnum.LOW
    if risk_score >= 50:
        risk_level = RiskLevelEnum.HIGH
    elif risk_score >= 25:
        risk_level = RiskLevelEnum.MEDIUM

    return tech_list, observations, risk_score, risk_level

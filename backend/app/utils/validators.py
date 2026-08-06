"""
Target & Domain Validation Utilities — Enterprise Scan Engine (Phase 7).

Validates FQDNs and domain targets while strictly rejecting:
- localhost / 127.0.0.1
- Private & non-routable IP ranges (RFC 1918, loopback, link-local)
- Unsupported protocols (ftp://, ssh://, file://)
- Malformed inputs and invalid syntax
"""
from __future__ import annotations

import ipaddress
import re
import urllib.parse
from typing import Tuple

_LABEL_RE = re.compile(r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$")
_MAX_DOMAIN_LEN = 253


def sanitize_target_domain(raw_input: str) -> str:
    """
    Sanitizes target string by stripping schemes, credentials, paths, ports, and trailing slashes.
    """
    if not raw_input:
        return ""

    target = raw_input.strip().lower()

    # Strip scheme if present
    if "://" in target:
        parsed = urllib.parse.urlparse(target)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Unsupported protocol scheme '{parsed.scheme}://'. Only HTTP/HTTPS or bare domains are allowed.")
        target = parsed.netloc or parsed.path

    # Strip userinfo (user:pass@domain)
    if "@" in target:
        target = target.split("@")[-1]

    # Strip port (:8000)
    target = re.sub(r":\d+", "", target)

    # Strip path, query, fragment
    target = re.split(r"[/?#]", target, maxsplit=1)[0]

    return target.rstrip(".")


def validate_scan_target(raw_input: str) -> Tuple[bool, str, str]:
    """
    Validates a target domain/IP input for defensive scanning.

    :param raw_input: Target domain string supplied by user API payload.
    :return: Tuple of (is_valid: bool, sanitized_domain: str, error_reason: str)
    """
    if not raw_input or not raw_input.strip():
        return False, "", "Target input cannot be empty."

    try:
        domain = sanitize_target_domain(raw_input)
    except ValueError as exc:
        return False, "", str(exc)

    if not domain:
        return False, "", "Target input is empty after sanitization."

    # Reject localhost explicitly
    if domain in ("localhost", "localhost.localdomain", "local"):
        return False, domain, "Scanning localhost or loopback targets is strictly forbidden."

    # Check if input is an IP address
    try:
        ip_obj = ipaddress.ip_address(domain)
        if ip_obj.is_loopback:
            return False, domain, "Scanning loopback IP addresses (127.0.0.0/8) is forbidden."
        if ip_obj.is_private:
            return False, domain, "Scanning RFC 1918 private IP addresses is forbidden."
        if ip_obj.is_link_local:
            return False, domain, "Scanning link-local IP addresses is forbidden."
        if ip_obj.is_multicast or ip_obj.is_reserved or ip_obj.is_unspecified:
            return False, domain, "Scanning non-routable or reserved IP addresses is forbidden."
        return True, domain, ""
    except ValueError:
        # Not an IP address — validate as FQDN / domain
        pass

    if len(domain) > _MAX_DOMAIN_LEN:
        return False, domain, f"Target domain exceeds maximum length of {_MAX_DOMAIN_LEN} characters."

    labels = domain.split(".")
    if len(labels) < 2:
        return False, domain, "Target domain must be a valid FQDN containing at least one dot (e.g. 'example.com')."

    for label in labels:
        if not label:
            return False, domain, "Target domain contains consecutive dots."
        if not _LABEL_RE.match(label):
            return False, domain, f"Domain label '{label}' is invalid. Labels must contain 1-63 alphanumeric characters or hyphens."

    return True, domain, ""

from datetime import datetime, timezone
import re
import socket
import ssl
import time
from typing import Any, Dict, List, Optional, Tuple

from app.scanner.modules.ssl.ssl_models import (
    RiskLevelEnum,
    SslCertificateInfo,
    SslObservation,
    SslProtocolInfo,
)


def sanitise_domain(target: str) -> str:
    """Strips protocols, paths, ports, and whitespace from a target string."""
    if not target:
        return ""
    target = target.strip()
    target = re.sub(r"^https?://", "", target, flags=re.IGNORECASE)
    target = target.split("/")[0]
    target = target.split(":")[0]
    return target.lower()


def fetch_ssl_data_sync(domain: str, port: int = 443, timeout: float = 5.0) -> Dict[str, Any]:
    """Synchronous socket + TLS handshake call to inspect SSL certificate & protocol metadata."""
    clean_domain = sanitise_domain(domain)
    if not clean_domain:
        return {"ok": False, "error": "Invalid or empty domain target."}

    context = ssl.create_default_context()
    context.check_hostname = True
    context.verify_mode = ssl.CERT_REQUIRED

    t0 = time.perf_counter()
    try:
        with socket.create_connection((clean_domain, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=clean_domain) as ssl_sock:
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                cert = ssl_sock.getpeercert()
                cipher_tuple = ssl_sock.cipher()  # (name, version, bits)
                protocol_version = ssl_sock.version()

                cipher_name = cipher_tuple[0] if cipher_tuple else None
                cipher_ver = cipher_tuple[1] if cipher_tuple else None
                cipher_bits = cipher_tuple[2] if cipher_tuple else None

                # Extract Signature Algorithm from DER binary cert using cryptography
                sig_alg = None
                try:
                    der_cert = ssl_sock.getpeercert(binary_form=True)
                    if der_cert:
                        from cryptography import x509
                        cert_obj = x509.load_der_x509_certificate(der_cert)
                        sig_alg = cert_obj.signature_algorithm_oid._name
                except Exception:
                    sig_alg = None

                # Extract Subject & Issuer
                subject_dict = dict(x[0] for x in cert.get("subject", ()))
                issuer_dict = dict(x[0] for x in cert.get("issuer", ()))

                subject_cn = subject_dict.get("commonName")
                issuer_cn = issuer_dict.get("commonName")
                issuer_org = issuer_dict.get("organizationName")

                # Extract Validity Dates
                not_before_str = cert.get("notBefore")
                not_after_str = cert.get("notAfter")

                valid_from_dt = None
                valid_to_dt = None
                if not_before_str:
                    valid_from_dt = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                if not_after_str:
                    valid_to_dt = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)

                now = datetime.now(timezone.utc)
                days_until_expiry = None
                is_expired = False

                if valid_to_dt:
                    days_until_expiry = (valid_to_dt - now).days
                    if days_until_expiry < 0:
                        is_expired = True

                is_self_signed = (subject_cn == issuer_cn) and bool(subject_cn)

                # Extract Subject Alternative Names (SANs)
                san_tuples = cert.get("subjectAltName", ())
                sans = [item[1] for item in san_tuples if item[0] == "DNS"]

                cert_info = SslCertificateInfo(
                    subject_cn=subject_cn,
                    issuer_cn=issuer_cn,
                    issuer_organization=issuer_org,
                    serial_number=str(cert.get("serialNumber")),
                    version=cert.get("version"),
                    signature_algorithm=sig_alg,
                    valid_from=valid_from_dt.isoformat() if valid_from_dt else None,
                    valid_to=valid_to_dt.isoformat() if valid_to_dt else None,
                    days_until_expiration=days_until_expiry,
                    is_expired=is_expired,
                    is_self_signed=is_self_signed,
                    subject_alternative_names=sans,
                )

                protocol_info = SslProtocolInfo(
                    protocol_version=protocol_version,
                    cipher_name=cipher_name,
                    cipher_version=cipher_ver,
                    cipher_bits=cipher_bits,
                    handshake_time_ms=latency_ms,
                )

                return {
                    "ok": True,
                    "cert_info": cert_info,
                    "protocol_info": protocol_info,
                }
    except socket.timeout:
        return {"ok": False, "error": f"TLS handshake connection to {clean_domain}:{port} timed out after {timeout}s."}
    except ssl.SSLCertVerificationError as exc:
        return {"ok": False, "error": f"SSL Certificate Verification Failed: {exc.verify_message or exc}"}
    except ssl.SSLError as exc:
        return {"ok": False, "error": f"SSL Protocol/Handshake Error: {exc.reason or exc}"}
    except Exception as exc:
        return {"ok": False, "error": f"Failed to connect to {clean_domain}:{port} for SSL analysis: {str(exc)}"}


def derive_ssl_observations(
    cert_info: Optional[SslCertificateInfo],
    protocol_info: Optional[SslProtocolInfo],
    is_valid: bool,
    error_message: Optional[str],
) -> List[SslObservation]:
    """Generates structured defensive security observations for SSL/TLS configuration."""
    obs: List[SslObservation] = []

    if not is_valid:
        obs.append(
            SslObservation(
                code="SSL_CONNECT_FAILED",
                severity=RiskLevelEnum.HIGH,
                title="TLS Connection Failure",
                description=f"Could not complete verified TLS handshake: {error_message or 'Unknown error'}",
            )
        )
        return obs

    if cert_info:
        if cert_info.is_expired:
            obs.append(
                SslObservation(
                    code="CERT_EXPIRED",
                    severity=RiskLevelEnum.CRITICAL,
                    title="SSL Certificate Expired",
                    description=f"Certificate expired {abs(cert_info.days_until_expiration or 0)} days ago.",
                )
            )
        elif cert_info.days_until_expiration is not None:
            if cert_info.days_until_expiration <= 7:
                obs.append(
                    SslObservation(
                        code="CERT_EXPIRING_CRITICAL",
                        severity=RiskLevelEnum.HIGH,
                        title="SSL Certificate Expiring Imminently",
                        description=f"Certificate expires in {cert_info.days_until_expiration} days.",
                    )
                )
            elif cert_info.days_until_expiration <= 30:
                obs.append(
                    SslObservation(
                        code="CERT_EXPIRING_WARNING",
                        severity=RiskLevelEnum.MEDIUM,
                        title="SSL Certificate Expiring Soon",
                        description=f"Certificate expires in {cert_info.days_until_expiration} days.",
                    )
                )

        if cert_info.is_self_signed:
            obs.append(
                SslObservation(
                    code="CERT_SELF_SIGNED",
                    severity=RiskLevelEnum.HIGH,
                    title="Self-Signed Certificate Detected",
                    description="Certificate issuer matches subject CN, indicating an untrusted self-signed certificate.",
                )
            )

        if cert_info.signature_algorithm:
            alg_lower = cert_info.signature_algorithm.lower()
            if "sha1" in alg_lower or "md5" in alg_lower:
                obs.append(
                    SslObservation(
                        code="WEAK_SIGNATURE_ALGORITHM",
                        severity=RiskLevelEnum.HIGH,
                        title="Weak Certificate Signature Algorithm",
                        description=f"Certificate uses deprecated/weak signature algorithm: {cert_info.signature_algorithm}.",
                    )
                )

        if not cert_info.subject_alternative_names:
            obs.append(
                SslObservation(
                    code="CERT_NO_SAN",
                    severity=RiskLevelEnum.LOW,
                    title="Missing Subject Alternative Names (SAN)",
                    description="Certificate does not contain Subject Alternative Names extension.",
                )
            )

    if protocol_info:
        ver = (protocol_info.protocol_version or "").upper()
        if "SSL" in ver or "TLSV1.0" in ver or "TLSV1.1" in ver:
            obs.append(
                SslObservation(
                    code="WEAK_TLS_PROTOCOL",
                    severity=RiskLevelEnum.HIGH,
                    title="Deprecated TLS Protocol Version Supported",
                    description=f"Target server negotiated deprecated protocol version: {protocol_info.protocol_version}.",
                )
            )

        if protocol_info.cipher_bits and protocol_info.cipher_bits < 128:
            obs.append(
                SslObservation(
                    code="WEAK_CIPHER_KEY",
                    severity=RiskLevelEnum.HIGH,
                    title="Weak Cipher Key Encryption",
                    description=f"Cipher key size is only {protocol_info.cipher_bits} bits (< 128 bits required).",
                )
            )

    if not obs:
        obs.append(
            SslObservation(
                code="SSL_CONFIG_HEALTHY",
                severity=RiskLevelEnum.LOW,
                title="SSL/TLS Posture Healthy",
                description="Valid SSL certificate with trusted CA chain, active validity period, and secure TLS configuration.",
            )
        )

    return obs


def calculate_ssl_risk_score(observations: List[SslObservation]) -> Tuple[int, RiskLevelEnum]:
    """Calculates risk score (0-100) and risk level from security observations."""
    score = 0
    weights = {
        RiskLevelEnum.CRITICAL: 50,
        RiskLevelEnum.HIGH: 30,
        RiskLevelEnum.MEDIUM: 15,
        RiskLevelEnum.LOW: 0,
    }

    for ob in observations:
        score += weights.get(ob.severity, 0)

    score = min(score, 100)

    if score >= 80:
        level = RiskLevelEnum.CRITICAL
    elif score >= 50:
        level = RiskLevelEnum.HIGH
    elif score >= 20:
        level = RiskLevelEnum.MEDIUM
    else:
        level = RiskLevelEnum.LOW

    return score, level

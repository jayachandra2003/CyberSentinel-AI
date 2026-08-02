"""Enterprise Session Security Utilities Module.

Provides cryptographic helpers for session UUID generation, high-entropy opaque
refresh token generation, HMAC-SHA256 refresh token hashing, constant-time token verification,
and timezone-aware UTC session expiration calculations.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
import uuid
from typing import Optional
from app.core.config import settings


def generate_session_uuid() -> str:
    """Generates a unique random UUIDv4 string for session identification.

    Returns:
        str: A 36-character UUIDv4 string representation.
    """
    return str(uuid.uuid4())


def generate_refresh_token() -> str:
    """Generates a cryptographically secure, high-entropy opaque refresh token.

    Returns:
        str: A URL-safe base64-encoded random string with at least 64 bytes of entropy.
    """
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Computes an HMAC-SHA256 hex digest of a raw refresh token using server-side SECRET_KEY.

    Args:
        token (str): The raw refresh token to hash.

    Returns:
        str: The 64-character hexadecimal HMAC-SHA256 digest.
    """
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_refresh_token(token: str, stored_hash: str) -> bool:
    """Verifies a raw refresh token against its stored HMAC-SHA256 digest using constant-time comparison.

    Args:
        token (str): The raw refresh token supplied by client.
        stored_hash (str): The expected HMAC-SHA256 hex digest stored in PostgreSQL.

    Returns:
        bool: True if the computed HMAC matches stored_hash in constant time, False otherwise.
    """
    if not token or not stored_hash:
        return False
    computed_hash = hash_refresh_token(token)
    return hmac.compare_digest(computed_hash, stored_hash)


def get_session_expiry(remember_device: bool = False) -> datetime:
    """Calculates session expiration timestamp based on Remember Device preference.

    Args:
        remember_device (bool): If True, session lasts for REMEMBER_DEVICE_DAYS (30 days).
            If False, session lasts for REFRESH_TOKEN_EXPIRE_HOURS (24 hours).

    Returns:
        datetime: Timezone-aware UTC expiration datetime object.
    """
    now = touch_session_time()
    if remember_device:
        return now + timedelta(days=settings.REMEMBER_DEVICE_DAYS)
    return now + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)


def is_session_expired(expires_at: datetime) -> bool:
    """Determines if a session expiration timestamp has passed.

    Args:
        expires_at (datetime): The session expiration timestamp to evaluate.

    Returns:
        bool: True if expires_at is equal to or earlier than current UTC time, False otherwise.
    """
    if not expires_at:
        return True
    now = touch_session_time()
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= now


def touch_session_time() -> datetime:
    """Returns current timezone-aware UTC datetime timestamp for standardized session time tracking.

    Returns:
        datetime: Current UTC datetime with tzinfo set to timezone.utc.
    """
    return datetime.now(timezone.utc)

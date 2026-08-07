"""
Retry Handler — Enterprise Scan Engine (Phase 7 Stage 2).

Provides reusable execution wrapper for scanner modules with:
- Configurable max retries (settings.MAX_RETRIES)
- Exponential backoff (settings.RETRY_BACKOFF_FACTOR)
- Transient vs permanent error classification
- Immediate cancellation aborts
- Structured retry logging
"""
from __future__ import annotations

import asyncio
import logging
import socket
import ssl
from typing import Any, Callable, Coroutine, Optional, TypeVar, Union

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")


def is_retryable_exception(exc: Exception) -> bool:
    """
    Classifies exceptions into transient/retryable vs permanent errors.
    
    Retryable:
    - Timeouts (asyncio.TimeoutError, socket.timeout, httpx.TimeoutException, dns.exception.Timeout)
    - Network/Connection errors (ConnectionError, ConnectionResetError, ConnectionRefusedError, socket.error)
    - SSL Handshake failures (ssl.SSLError)
    
    Non-retryable:
    - Target validation errors (ValueError, TypeError)
    - Data structure or parsing bugs (KeyError, AttributeError, IndexError)
    """
    if isinstance(exc, (asyncio.TimeoutError, ConnectionError, ConnectionResetError, ConnectionRefusedError, TimeoutError, socket.error, ssl.SSLError)):
        return True

    exc_type_name = type(exc).__name__.lower()
    exc_module = type(exc).__module__.lower()

    # Generic string checks for HTTP / DNS / Socket library transient exceptions
    if any(k in exc_type_name for k in ["timeout", "connection", "reset", "refused", "network", "ssl", "dns"]):
        return True

    if any(k in exc_module for k in ["httpx", "dns", "socket", "ssl", "http"]):
        if not isinstance(exc, (ValueError, TypeError, KeyError, AttributeError)):
            return True

    return False


class RetryHandler:
    """
    Reusable Retry Handler executing async callables with exponential backoff.
    """

    @staticmethod
    async def execute(
        func: Callable[[], Coroutine[Any, Any, T]],
        max_retries: Optional[int] = None,
        backoff_factor: Optional[float] = None,
        module_id: str = "unknown",
        scan_id: Union[int, str] = 0,
        is_cancelled_func: Optional[Callable[[], bool]] = None,
    ) -> T:
        """
        Executes func() with retry logic and backoff.
        
        Args:
            func: Async callable to execute
            max_retries: Optional retry attempt count override (defaults to settings.MAX_RETRIES)
            backoff_factor: Optional backoff factor override (defaults to settings.RETRY_BACKOFF_FACTOR)
            module_id: Identifier of scanner module for logging
            scan_id: Scan ID for logging
            is_cancelled_func: Optional callback returning True if scan or worker was cancelled
        """
        retries = max_retries if max_retries is not None else getattr(settings, "MAX_RETRIES", 2)
        backoff = backoff_factor if backoff_factor is not None else getattr(settings, "RETRY_BACKOFF_FACTOR", 1.5)

        attempt = 0
        while True:
            attempt += 1

            if is_cancelled_func and is_cancelled_func():
                logger.info(f"[MODULE_CANCELLED] Cancellation detected before attempt #{attempt} of '{module_id}' (Scan #{scan_id}).")
                raise asyncio.CancelledError(f"Execution of '{module_id}' cancelled.")

            try:
                return await func()
            except Exception as exc:
                if is_cancelled_func and is_cancelled_func():
                    raise asyncio.CancelledError(f"Execution of '{module_id}' cancelled during attempt.")

                if not is_retryable_exception(exc):
                    logger.warning(
                        f"[NON_RETRYABLE_FAILURE] Module '{module_id}' (Scan #{scan_id}) encountered non-retryable error: {type(exc).__name__}: {exc}"
                    )
                    raise exc

                if attempt > retries:
                    logger.error(
                        f"[RETRY_EXHAUSTED] Module '{module_id}' (Scan #{scan_id}) failed after {attempt} attempt(s) (Max retries: {retries}): {type(exc).__name__}: {exc}"
                    )
                    raise exc

                delay = float(backoff) ** (attempt - 1)
                logger.warning(
                    f"[MODULE_RETRY] Module '{module_id}' (Scan #{scan_id}) failed attempt #{attempt}/{retries + 1} with retriable error ({type(exc).__name__}: {exc}). Retrying in {delay:.2f}s..."
                )

                # Granular sleep to allow fast cancellation interrupt
                sleep_chunk = 0.05
                elapsed = 0.0
                while elapsed < delay:
                    if is_cancelled_func and is_cancelled_func():
                        logger.info(f"[MODULE_CANCELLED] Cancellation detected during retry backoff for '{module_id}' (Scan #{scan_id}).")
                        raise asyncio.CancelledError(f"Execution of '{module_id}' cancelled during backoff.")
                    await asyncio.sleep(min(sleep_chunk, delay - elapsed))
                    elapsed += sleep_chunk

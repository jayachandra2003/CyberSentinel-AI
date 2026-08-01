from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import logger


class AuditMiddleware(BaseHTTPMiddleware):
    """Audit Logging middleware for intercepting HTTP calls."""

    async def dispatch(self, request: Request, call_next):
        logger.info(f"AUDIT INTERCEPT: {request.method} {request.url.path} - Host: {request.client.host if request.client else 'Unknown'}")
        response = await call_next(request)
        return response

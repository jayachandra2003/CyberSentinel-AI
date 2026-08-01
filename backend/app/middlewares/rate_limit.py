from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware placeholder."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        return response

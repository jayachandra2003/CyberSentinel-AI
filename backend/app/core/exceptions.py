from typing import Any, Optional
from fastapi import HTTPException, status


class SentinelException(HTTPException):
    """Base exception class for CyberSentinel AI."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail: str = "An internal security platform error occurred.",
        headers: Optional[dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class UnauthorizedException(SentinelException):
    def __init__(self, detail: str = "Invalid authentication credentials."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(SentinelException):
    def __init__(self, detail: str = "Insufficient security permissions for resource."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundException(SentinelException):
    def __init__(self, detail: str = "Requested resource not found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationException(SentinelException):
    def __init__(self, detail: str = "Target verification or input payload invalid."):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.exceptions import SentinelException
from app.schemas.common import ApiResponse


def setup_error_handlers(app: FastAPI) -> None:
    """Configures global exception handlers."""

    @app.exception_handler(SentinelException)
    async def sentinel_exception_handler(request: Request, exc: SentinelException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ApiResponse[None](
                success=False,
                error=exc.detail,
                data=None,
            ).model_dump(mode="json"),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content=ApiResponse[None](
                success=False,
                error="An unexpected internal server error occurred.",
                data=None,
            ).model_dump(mode="json"),
        )

from fastapi import APIRouter
from app.core.config import settings
from app.schemas.common import ApiResponse, VersionResponse

router = APIRouter()


@router.get("/version", response_model=ApiResponse[VersionResponse])
async def get_version():
    """Version metadata endpoint."""
    return ApiResponse(
        success=True,
        data=VersionResponse(
            version=settings.VERSION,
            api_prefix=settings.API_V1_STR,
            environment=settings.ENVIRONMENT,
        ),
    )

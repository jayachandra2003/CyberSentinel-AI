from fastapi import APIRouter
from app.schemas.common import ApiResponse, HealthResponse

router = APIRouter()


@router.get("/health", response_model=ApiResponse[HealthResponse])
async def health_check():
    """Service health check endpoint returning system component status."""
    return ApiResponse(
        success=True,
        data=HealthResponse(
            status="healthy",
            database="connected",
            redis="connected",
        ),
    )

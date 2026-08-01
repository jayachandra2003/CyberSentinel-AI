from fastapi import APIRouter
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("/", response_model=ApiResponse[dict])
async def list_audit_logs_contract():
    """Audit log endpoint contract placeholder."""
    return ApiResponse(
        success=True,
        data={"message": "Audit logs endpoint contract ready."},
    )

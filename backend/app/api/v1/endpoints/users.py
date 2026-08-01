from fastapi import APIRouter, Depends, status
from app.schemas.common import ApiResponse
from app.schemas.user import UserResponse
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Current User Profile",
)
async def read_user_me(
    current_user: User = Depends(get_current_active_user),
):
    """Returns the details of the currently authenticated user."""
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )

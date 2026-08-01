from fastapi import APIRouter, Depends, Request, status
from app.schemas.common import ApiResponse
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshTokenRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.api.deps import get_auth_service, get_current_active_user
from app.models.user import User

router = APIRouter()


@router.post(
    "/register",
    response_model=ApiResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register Authorized Account",
)
async def register(
    payload: RegisterRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Registers a new authorized user account with hashed credentials."""
    client_ip = request.client.host if request.client else None
    user = await auth_service.register_user(payload, ip_address=client_ip)
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=ApiResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Authenticate & Generate Tokens",
)
async def login(
    payload: LoginRequest,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Authenticates credentials and returns JWT Access & Refresh Tokens."""
    client_ip = request.client.host if request.client else None
    token_response = await auth_service.authenticate_user(payload, ip_address=client_ip)
    return ApiResponse(
        success=True,
        data=token_response,
    )


@router.post(
    "/refresh",
    response_model=ApiResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Refresh JWT Tokens",
)
async def refresh(
    payload: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Validates refresh token and returns a new JWT Access Token."""
    token_response = await auth_service.refresh_tokens(payload.refresh_token)
    return ApiResponse(
        success=True,
        data=token_response,
    )


@router.post(
    "/logout",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Logout User Account",
)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Logs out user session and records an audit trail event."""
    client_ip = request.client.host if request.client else None
    await auth_service.logout_user(current_user.id, ip_address=client_ip)
    return ApiResponse(
        success=True,
        data={"message": "Logged out successfully."},
    )


@router.get(
    "/me",
    response_model=ApiResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Current Authenticated User Profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Returns details of currently authenticated user."""
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )

from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from app.schemas.common import ApiResponse
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    SessionResponse,
    RevokeSessionRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.session_service import SessionService
from app.api.deps import (
    get_auth_service,
    get_session_service,
    get_current_active_user,
    get_current_session,
)
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.user_session import UserSession

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
    summary="Refresh JWT Access & Refresh Tokens",
)
async def refresh(
    payload: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Validates refresh token, executes 1-time token rotation, and returns new tokens."""
    token_response = await auth_service.refresh_access_token(payload.refresh_token)
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
    current_session: Optional[UserSession] = Depends(get_current_session),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Logs out user session, revokes active device session, and records an audit trail event."""
    client_ip = request.client.host if request.client else None
    session_uuid = current_session.session_uuid if current_session else None
    await auth_service.logout_user(current_user.id, session_uuid=session_uuid, ip_address=client_ip)
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


@router.get(
    "/session",
    response_model=ApiResponse[SessionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Active Session Details",
)
async def get_current_session_details(
    current_user: User = Depends(get_current_active_user),
    current_session: Optional[UserSession] = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
):
    """Returns exact session metadata bound to the requesting JWT (sid claim)."""
    target_session = current_session
    if not target_session:
        sessions = await session_service.get_active_sessions_for_user(current_user.id)
        if not sessions:
            raise NotFoundException(detail="No active session found for user.")
        target_session = sessions[0]

    res_data = SessionResponse.model_validate(target_session)
    res_data.current_session = True
    return ApiResponse(
        success=True,
        data=res_data,
    )


@router.get(
    "/sessions",
    response_model=ApiResponse[List[SessionResponse]],
    status_code=status.HTTP_200_OK,
    summary="List All Active Sessions",
)
async def list_active_sessions(
    current_user: User = Depends(get_current_active_user),
    current_session: Optional[UserSession] = Depends(get_current_session),
    session_service: SessionService = Depends(get_session_service),
):
    """Lists all active sessions belonging to current user, marking current_session=True for the requesting session."""
    sessions = await session_service.get_active_sessions_for_user(current_user.id)
    res_list = []
    current_uuid = current_session.session_uuid if current_session else (sessions[0].session_uuid if sessions else None)
    for s in sessions:
        item = SessionResponse.model_validate(s)
        if current_uuid and s.session_uuid == current_uuid:
            item.current_session = True
        res_list.append(item)

    return ApiResponse(
        success=True,
        data=res_list,
    )


@router.post(
    "/revoke-session",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Revoke Specific Session",
)
async def revoke_session(
    payload: RevokeSessionRequest,
    current_user: User = Depends(get_current_active_user),
    session_service: SessionService = Depends(get_session_service),
):
    """Revokes a specific session belonging to the authenticated user."""
    await session_service.revoke_user_session(
        current_user_id=current_user.id,
        session_uuid=payload.session_uuid,
    )
    return ApiResponse(
        success=True,
        data={"message": f"Session '{payload.session_uuid}' revoked successfully."},
    )


@router.post(
    "/revoke-all",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Revoke All Sessions for User",
)
async def revoke_all_sessions(
    current_user: User = Depends(get_current_active_user),
    session_service: SessionService = Depends(get_session_service),
):
    """Revokes all active sessions for the current authenticated user across devices."""
    count = await session_service.revoke_all_sessions(
        user_id=current_user.id, reason="REVOKE_ALL_SESSIONS"
    )
    return ApiResponse(
        success=True,
        data={"message": f"Revoked {count} active sessions successfully."},
    )

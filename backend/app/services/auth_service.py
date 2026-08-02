from datetime import timedelta
from typing import Optional
from app.repositories.user_repository import UserRepository
from app.services.session_service import SessionService
from app.services.audit_service import AuditService
from app.services.base_service import BaseService
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.core.security import verify_password, get_password_hash
from app.security.jwt import create_access_token, create_refresh_token, decode_jwt_token
from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.config import settings
from app.models.user import User


class AuthService(BaseService):
    """Authentication Domain Service integrating user management with Enterprise Session Infrastructure."""

    def __init__(
        self,
        user_repo: UserRepository,
        audit_service: AuditService,
        session_service: SessionService,
    ):
        self.user_repo = user_repo
        self.audit_service = audit_service
        self.session_service = session_service

    async def register_user(self, data: RegisterRequest, ip_address: Optional[str] = None) -> User:
        existing_user = await self.user_repo.get_by_email(data.email)
        if existing_user:
            await self.audit_service.log_event(
                action="USER_REGISTER_FAILED",
                resource=data.email,
                status="FAILED",
                ip_address=ip_address,
                details_json='{"reason": "Email already registered"}',
            )
            raise ValidationException(detail="User email is already registered.")

        hashed_pass = get_password_hash(data.password)
        user = await self.user_repo.create_user(
            email=data.email,
            password_hash=hashed_pass,
            full_name=data.full_name,
        )

        await self.audit_service.log_event(
            action="USER_REGISTERED",
            resource=f"user:{user.id}",
            user_id=user.id,
            status="SUCCESS",
            ip_address=ip_address,
        )

        return user

    async def authenticate_user(
        self, data: LoginRequest, ip_address: Optional[str] = None
    ) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            await self.audit_service.log_event(
                action="USER_LOGIN_FAILED",
                resource=data.email,
                status="FAILED",
                ip_address=ip_address,
                details_json='{"reason": "Invalid credentials"}',
            )
            raise UnauthorizedException(detail="Invalid email or password.")

        if not user.is_active:
            raise UnauthorizedException(detail="User account is deactivated.")

        # Create Enterprise PostgreSQL Session via injected SessionService
        user_session, raw_refresh_token = await self.session_service.create_session(
            user_id=user.id,
            remember_device=bool(data.remember_me),
            ip_address=ip_address,
            login_method="PASSWORD",
            login_source="web",
        )

        # Create JWT Access Token with session binding (sid claim)
        if data.remember_me:
            access_delta = timedelta(days=settings.REMEMBER_DEVICE_DAYS)
            expires_in_seconds = settings.REMEMBER_DEVICE_DAYS * 24 * 3600
        else:
            access_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        access_token = create_access_token(
            subject=user.id,
            expires_delta=access_delta,
            sid=user_session.session_uuid,
        )

        await self.audit_service.log_event(
            action="USER_LOGIN_SUCCESS",
            resource=f"user:{user.id}",
            user_id=user.id,
            status="SUCCESS",
            ip_address=ip_address,
            details_json=f'{{"session_uuid": "{user_session.session_uuid}", "remember_device": {str(data.remember_me).lower()}}}',
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=expires_in_seconds,
            user=UserResponse.model_validate(user),
        )

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Validates incoming raw refresh token, executes 1-time rotation, and issues new JWT access token."""
        # 1. Validate session
        session = await self.session_service.validate_refresh_token(refresh_token)
        if not session:
            raise UnauthorizedException(detail="Invalid, expired, or revoked refresh token.")

        # 2. Perform 1-time token rotation
        new_raw_refresh_token, updated_session = await self.session_service.rotate_refresh_token(session)

        # 3. Lookup user
        user = await self.user_repo.get(updated_session.user_id)
        if not user or not user.is_active:
            raise UnauthorizedException(detail="User account inactive or not found.")

        # 4. Issue new access token with session binding (sid claim)
        if updated_session.remember_device:
            access_delta = timedelta(days=settings.REMEMBER_DEVICE_DAYS)
            expires_in_seconds = settings.REMEMBER_DEVICE_DAYS * 24 * 3600
        else:
            access_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        new_access_token = create_access_token(
            subject=user.id,
            expires_delta=access_delta,
            sid=updated_session.session_uuid,
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_raw_refresh_token,
            token_type="bearer",
            expires_in=expires_in_seconds,
            user=UserResponse.model_validate(user),
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """Legacy compatibility wrapper calling refresh_access_token."""
        return await self.refresh_access_token(refresh_token)

    async def logout_user(self, user_id: int, ip_address: Optional[str] = None) -> None:
        await self.audit_service.log_event(
            action="USER_LOGOUT",
            resource=f"user:{user_id}",
            user_id=user_id,
            status="SUCCESS",
            ip_address=ip_address,
        )

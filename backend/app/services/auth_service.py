from datetime import timedelta
from typing import Optional
from app.repositories.user_repository import UserRepository
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
    def __init__(self, user_repo: UserRepository, audit_service: AuditService):
        self.user_repo = user_repo
        self.audit_service = audit_service

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

        # Configure dynamic session lifetime based on "Remember Device" setting
        if data.remember_me:
            access_delta = timedelta(days=settings.REMEMBER_DEVICE_DAYS)
            refresh_delta = timedelta(days=settings.REMEMBER_DEVICE_DAYS + 7)
            expires_in_seconds = settings.REMEMBER_DEVICE_DAYS * 24 * 3600
        else:
            access_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            refresh_delta = timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)
            expires_in_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        access_token = create_access_token(subject=user.id, expires_delta=access_delta)
        refresh_token = create_refresh_token(subject=user.id, expires_delta=refresh_delta)

        await self.audit_service.log_event(
            action="USER_LOGIN_SUCCESS",
            resource=f"user:{user.id}",
            user_id=user.id,
            status="SUCCESS",
            ip_address=ip_address,
            details_json=f'{{"remember_device": {str(data.remember_me).lower()}}}',
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in_seconds,
            user=UserResponse.model_validate(user),
        )

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        payload = decode_jwt_token(refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedException(detail="Invalid token type for refresh.")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException(detail="Invalid token subject.")

        user = await self.user_repo.get(int(user_id_str))
        if not user or not user.is_active:
            raise UnauthorizedException(detail="User account inactive or not found.")

        new_access_token = create_access_token(subject=user.id)
        new_refresh_token = create_refresh_token(subject=user.id)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )

    async def logout_user(self, user_id: int, ip_address: Optional[str] = None) -> None:
        await self.audit_service.log_event(
            action="USER_LOGOUT",
            resource=f"user:{user_id}",
            user_id=user_id,
            status="SUCCESS",
            ip_address=ip_address,
        )

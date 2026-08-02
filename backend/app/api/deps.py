from typing import AsyncGenerator, Optional
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import AsyncSessionLocal
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.audit_repository import AuditRepository
from app.services.user_service import UserService
from app.services.session_service import SessionService
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.security.jwt import decode_jwt_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.rbac import PermissionEnum, has_permission
from app.models.user import User
from app.models.user_session import UserSession

security_bearer = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_user_repository(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)


def get_session_repository(session: AsyncSession = Depends(get_db)) -> SessionRepository:
    return SessionRepository(session)


def get_audit_repository(session: AsyncSession = Depends(get_db)) -> AuditRepository:
    return AuditRepository(session)


def get_audit_service(
    audit_repo: AuditRepository = Depends(get_audit_repository),
) -> AuditService:
    return AuditService(audit_repo)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(user_repo)


def get_session_service(
    session_repo: SessionRepository = Depends(get_session_repository),
) -> SessionService:
    return SessionService(session_repo)


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    audit_service: AuditService = Depends(get_audit_service),
    session_service: SessionService = Depends(get_session_service),
) -> AuthService:
    return AuthService(user_repo, audit_service, session_service)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    user_service: UserService = Depends(get_user_service),
) -> User:
    if not credentials or not credentials.credentials:
        raise UnauthorizedException(detail="Authentication token missing.")

    token = credentials.credentials
    payload = decode_jwt_token(token)
    if payload.get("type") != "access":
        raise UnauthorizedException(detail="Invalid token type.")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException(detail="Invalid token subject.")

    user = await user_service.get_user_by_id(int(user_id_str))
    if not user:
        raise UnauthorizedException(detail="User not found.")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise UnauthorizedException(detail="User account is inactive.")
    return current_user


async def get_current_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    session_service: SessionService = Depends(get_session_service),
    current_user: User = Depends(get_current_active_user),
) -> Optional[UserSession]:
    """Extracts sid claim from JWT access token, retrieves exact active session, and verifies ownership."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_jwt_token(credentials.credentials)
        sid = payload.get("sid")
        if sid:
            session = await session_service.get_active_session(sid)
            if session and session.user_id == current_user.id:
                return session
    except Exception:
        return None
    return None


def require_permission(permission: PermissionEnum):
    async def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if not has_permission(current_user.role, permission):
            raise ForbiddenException(detail=f"Permission '{permission}' denied for role '{current_user.role}'.")
        return current_user

    return permission_checker

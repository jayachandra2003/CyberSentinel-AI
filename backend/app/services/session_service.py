from datetime import datetime, timezone
from typing import Optional, List
from app.repositories.session_repository import SessionRepository
from app.services.base_service import BaseService
from app.models.user_session import UserSession


class SessionService(BaseService):
    """Core domain service for user session creation, state updates, revocation, and maintenance."""

    def __init__(self, session_repo: SessionRepository):
        self.session_repo = session_repo

    async def create_session(
        self,
        session_uuid: str,
        user_id: int,
        refresh_token_hash: str,
        expires_at: datetime,
        remember_device: bool = False,
        device_name: Optional[str] = "Desktop Browser",
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        login_method: str = "PASSWORD",
        login_source: Optional[str] = "web",
    ) -> UserSession:
        """Creates a new active database session record."""
        now = datetime.now(timezone.utc)
        user_session = UserSession(
            session_uuid=session_uuid,
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            created_at=now,
            last_activity=now,
            last_refresh_at=now,
            expires_at=expires_at,
            remember_device=remember_device,
            ip_address=ip_address,
            user_agent=user_agent,
            device_name=device_name or "Desktop Browser",
            login_method=login_method,
            is_active=True,
            login_source=login_source or "web",
            mfa_verified=False,
        )
        return await self.session_repo.create(user_session)

    async def get_session_by_uuid(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by its unique UUID regardless of active status."""
        return await self.session_repo.get_by_uuid(session_uuid)

    async def get_active_session(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by UUID only if it is active and unexpired."""
        return await self.session_repo.get_active_by_uuid(session_uuid)

    async def update_last_activity(self, session_uuid: str) -> Optional[UserSession]:
        """Updates only the last_activity timestamp for a session."""
        session_record = await self.session_repo.get_by_uuid(session_uuid)
        if session_record and session_record.is_active:
            session_record.last_activity = datetime.now(timezone.utc)
            await self.session_repo.update(session_record)
        return session_record

    async def update_last_refresh(
        self, session_uuid: str, new_refresh_token_hash: Optional[str] = None
    ) -> Optional[UserSession]:
        """Updates the last_refresh_at timestamp and optionally the refresh token hash during rotation."""
        session_record = await self.session_repo.get_by_uuid(session_uuid)
        if session_record and session_record.is_active:
            now = datetime.now(timezone.utc)
            session_record.last_refresh_at = now
            session_record.last_activity = now
            if new_refresh_token_hash:
                session_record.refresh_token_hash = new_refresh_token_hash
            await self.session_repo.update(session_record)
        return session_record

    async def revoke_session(
        self, session_uuid: str, reason: str = "MANUAL_LOGOUT"
    ) -> Optional[UserSession]:
        """Revokes a specific active session."""
        return await self.session_repo.revoke_session(session_uuid, reason=reason)

    async def revoke_all_sessions(
        self, user_id: int, reason: str = "REVOKE_ALL_SESSIONS", except_session_uuid: Optional[str] = None
    ) -> int:
        """Revokes all active sessions for a user, with optional exemption for current session."""
        return await self.session_repo.revoke_all_user_sessions(
            user_id=user_id, reason=reason, current_session_uuid=except_session_uuid
        )

    async def cleanup_expired_sessions(self) -> int:
        """Marks expired active sessions as inactive without deleting database records."""
        expired_sessions = await self.session_repo.get_expired_active_sessions()
        count = 0
        now = datetime.now(timezone.utc)
        for s in expired_sessions:
            s.is_active = False
            s.revoked_at = now
            s.revoked_reason = "EXPIRED"
            await self.session_repo.update(s)
            count += 1
        return count

    async def count_active_sessions(self, user_id: Optional[int] = None) -> int:
        """Returns integer count of active, unexpired sessions globally or for a specific user."""
        return await self.session_repo.count_active_sessions(user_id=user_id)

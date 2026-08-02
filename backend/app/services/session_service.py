from datetime import datetime
from typing import Optional, List, Tuple
from app.repositories.session_repository import SessionRepository
from app.services.base_service import BaseService
from app.models.user_session import UserSession
from app.security.session_security import (
    generate_session_uuid,
    generate_refresh_token,
    hash_refresh_token,
    get_session_expiry,
    touch_session_time,
    is_session_expired,
)


class SessionService(BaseService):
    """Core domain service for user session creation, state updates, revocation, and maintenance."""

    def __init__(self, session_repo: SessionRepository):
        self.session_repo = session_repo

    async def create_session(
        self,
        user_id: int,
        remember_device: bool = False,
        device_name: Optional[str] = "Desktop Browser",
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        login_method: str = "PASSWORD",
        login_source: Optional[str] = "web",
    ) -> Tuple[UserSession, str]:
        """Creates a new active database session record and returns both the record and raw refresh token.

        Args:
            user_id (int): The ID of the user creating the session.
            remember_device (bool): If True, session expiry is set for 30 days; otherwise 24 hours.
            device_name (Optional[str]): Human-readable device string.
            user_agent (Optional[str]): Client HTTP User-Agent header string.
            ip_address (Optional[str]): Client IPv4/IPv6 address.
            login_method (str): Authentication mechanism used (default: "PASSWORD").
            login_source (Optional[str]): Client application interface (default: "web").

        Returns:
            Tuple[UserSession, str]: A tuple containing the persisted UserSession ORM instance
                and the raw unhashed opaque refresh token string (never stored in DB).
        """
        session_uuid = generate_session_uuid()
        raw_refresh_token = generate_refresh_token()
        refresh_token_hash = hash_refresh_token(raw_refresh_token)
        expires_at = get_session_expiry(remember_device=remember_device)
        now = touch_session_time()

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
        created_record = await self.session_repo.create(user_session)
        return created_record, raw_refresh_token

    async def get_session_by_uuid(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by its unique UUID regardless of active status."""
        return await self.session_repo.get_by_uuid(session_uuid)

    async def get_active_session(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by UUID only if active and unexpired. Revokes if expired."""
        session_record = await self.session_repo.get_by_uuid(session_uuid)
        if not session_record or not session_record.is_active:
            return None

        if is_session_expired(session_record.expires_at):
            now = touch_session_time()
            session_record.is_active = False
            session_record.revoked_at = now
            session_record.revoked_reason = "EXPIRED"
            await self.session_repo.update(session_record)
            return None

        return session_record

    async def update_last_activity(self, session_uuid: str) -> Optional[UserSession]:
        """Updates only the last_activity timestamp using touch_session_time()."""
        session_record = await self.session_repo.get_by_uuid(session_uuid)
        if session_record and session_record.is_active:
            session_record.last_activity = touch_session_time()
            await self.session_repo.update(session_record)
        return session_record

    async def update_last_refresh(
        self, session_uuid: str, new_refresh_token_hash: Optional[str] = None
    ) -> Optional[UserSession]:
        """Updates last_refresh_at timestamp and optionally updates refresh token hash during rotation."""
        session_record = await self.session_repo.get_by_uuid(session_uuid)
        if session_record and session_record.is_active:
            now = touch_session_time()
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
        """Marks expired active sessions as inactive using is_session_expired() without deleting records."""
        active_sessions = await self.session_repo.get_all()
        count = 0
        now = touch_session_time()
        for s in active_sessions:
            if s.is_active and is_session_expired(s.expires_at):
                s.is_active = False
                s.revoked_at = now
                s.revoked_reason = "EXPIRED"
                await self.session_repo.update(s)
                count += 1
        return count

    async def count_active_sessions(self, user_id: Optional[int] = None) -> int:
        """Returns integer count of active, unexpired sessions globally or for a specific user."""
        return await self.session_repo.count_active_sessions(user_id=user_id)

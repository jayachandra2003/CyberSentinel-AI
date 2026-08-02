from datetime import datetime
from typing import Optional, List, Tuple
from app.repositories.session_repository import SessionRepository
from app.services.base_service import BaseService
from app.models.user_session import UserSession
from app.core.exceptions import NotFoundException, ForbiddenException
from app.security.session_security import (
    generate_session_uuid,
    generate_refresh_token,
    hash_refresh_token,
    get_session_expiry,
    touch_session_time,
    is_session_expired,
)


class SessionService(BaseService):
    """Core domain service for user session creation, state updates, rotation, revocation, and maintenance."""

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
        """Creates a new active database session record and returns both the record and raw refresh token."""
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

    async def validate_refresh_token(self, raw_refresh_token: str) -> Optional[UserSession]:
        """Hashes incoming raw refresh token, looks up matching active session, and validates expiration.

        Args:
            raw_refresh_token (str): Raw opaque refresh token supplied by client.

        Returns:
            Optional[UserSession]: Active UserSession record if valid and unexpired, None otherwise.
        """
        if not raw_refresh_token:
            return None

        incoming_hash = hash_refresh_token(raw_refresh_token)
        session_record = await self.session_repo.get_by_refresh_hash(incoming_hash)
        if not session_record or not session_record.is_active:
            return None

        return await self.expire_session_if_needed(session_record)

    async def rotate_refresh_token(self, session: UserSession) -> Tuple[str, UserSession]:
        """Performs 1-time token rotation: generates new raw token & hash, updates timestamps, and persists.

        Args:
            session (UserSession): The active UserSession record to rotate.

        Returns:
            Tuple[str, UserSession]: Tuple containing the new raw opaque refresh token string
                and the updated UserSession ORM record.
        """
        new_raw_refresh_token = generate_refresh_token()
        new_hash = hash_refresh_token(new_raw_refresh_token)

        now = touch_session_time()
        session.refresh_token_hash = new_hash
        session.last_refresh_at = now
        session.last_activity = now

        updated_session = await self.session_repo.update(session)
        return new_raw_refresh_token, updated_session

    async def expire_session_if_needed(self, session: UserSession) -> Optional[UserSession]:
        """Evaluates session expiration timestamp. If expired, marks inactive and persists.

        Args:
            session (UserSession): UserSession record to evaluate.

        Returns:
            Optional[UserSession]: None if session was expired, otherwise the active UserSession.
        """
        if is_session_expired(session.expires_at):
            now = touch_session_time()
            session.is_active = False
            session.revoked_at = now
            session.revoked_reason = "EXPIRED"
            await self.session_repo.update(session)
            return None
        return session

    async def get_session_by_uuid(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by its unique UUID regardless of active status."""
        return await self.session_repo.get_by_uuid(session_uuid)

    async def get_active_session(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by UUID only if active and unexpired. Revokes if expired."""
        session_record = await self.session_repo.get_by_uuid(session_uuid)
        if not session_record or not session_record.is_active:
            return None

        return await self.expire_session_if_needed(session_record)

    async def get_active_sessions_for_user(self, user_id: int) -> List[UserSession]:
        """Returns all active sessions for a user ordered newest first."""
        return await self.session_repo.get_all_active_by_user(user_id)

    async def revoke_user_session(
        self, current_user_id: int, session_uuid: str
    ) -> UserSession:
        """Revokes a session belonging to current_user_id after validating ownership.

        Args:
            current_user_id (int): ID of the authenticated user requesting revocation.
            session_uuid (str): UUID of the session to revoke.

        Returns:
            UserSession: The revoked UserSession instance.

        Raises:
            NotFoundException: If the session_uuid does not exist.
            ForbiddenException: If the session belongs to a different user.
        """
        session = await self.get_session_by_uuid(session_uuid)
        if not session:
            raise NotFoundException(detail="Target session not found.")

        if session.user_id != current_user_id:
            raise ForbiddenException(detail="You cannot revoke another user's session.")

        revoked_session = await self.revoke_session(session_uuid, reason="USER_REVOKED")
        return revoked_session or session

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

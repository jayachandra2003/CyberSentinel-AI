from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_session import UserSession
from app.repositories.base_repository import BaseRepository


class SessionRepository(BaseRepository[UserSession]):
    """Data access repository for UserSession ORM model."""

    def __init__(self, session: AsyncSession):
        super().__init__(UserSession, session)

    async def get_by_uuid(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by its unique UUID regardless of state."""
        stmt = select(UserSession).where(UserSession.session_uuid == session_uuid)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_active_by_uuid(self, session_uuid: str) -> Optional[UserSession]:
        """Retrieves a session record by UUID only if it is active and unexpired."""
        now = datetime.now(timezone.utc)
        stmt = select(UserSession).where(
            UserSession.session_uuid == session_uuid,
            UserSession.is_active == True,
            UserSession.expires_at > now,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_refresh_token_hash(self, refresh_token_hash: str) -> Optional[UserSession]:
        """Retrieves a session record matching a given refresh token hash."""
        stmt = select(UserSession).where(UserSession.refresh_token_hash == refresh_token_hash)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_all_active_by_user(self, user_id: int) -> List[UserSession]:
        """Retrieves all active and unexpired sessions for a specific user ordered by last activity."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
                UserSession.expires_at > now,
            )
            .order_by(UserSession.last_activity.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_active_sessions(self, user_id: Optional[int] = None) -> int:
        """Counts total active, unexpired sessions globally or for a specific user."""
        now = datetime.now(timezone.utc)
        stmt = select(func.count(UserSession.id)).where(
            UserSession.is_active == True,
            UserSession.expires_at > now,
        )
        if user_id is not None:
            stmt = stmt.where(UserSession.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0

    async def get_expired_active_sessions(self) -> List[UserSession]:
        """Retrieves all sessions marked active whose expiration date has passed."""
        now = datetime.now(timezone.utc)
        stmt = select(UserSession).where(
            UserSession.is_active == True,
            UserSession.expires_at <= now,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def revoke_session(
        self, session_uuid: str, reason: str = "MANUAL_LOGOUT"
    ) -> Optional[UserSession]:
        """Revokes a session by setting is_active=False and timestamping revoked_at."""
        stmt = select(UserSession).where(UserSession.session_uuid == session_uuid)
        result = await self.session.execute(stmt)
        user_session = result.scalars().first()
        if user_session and user_session.is_active:
            user_session.is_active = False
            user_session.revoked_at = datetime.now(timezone.utc)
            user_session.revoked_reason = reason
            await self.session.commit()
            await self.session.refresh(user_session)
        return user_session

    async def revoke_all_user_sessions(
        self, user_id: int, reason: str = "REVOKE_ALL_SESSIONS", current_session_uuid: Optional[str] = None
    ) -> int:
        """Revokes all active sessions for a user, with optional exemption for current session."""
        now = datetime.now(timezone.utc)
        stmt = select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
        )
        if current_session_uuid:
            stmt = stmt.where(UserSession.session_uuid != current_session_uuid)

        result = await self.session.execute(stmt)
        sessions_to_revoke = list(result.scalars().all())
        count = 0
        for s in sessions_to_revoke:
            s.is_active = False
            s.revoked_at = now
            s.revoked_reason = reason
            count += 1
        if count > 0:
            await self.session.commit()
        return count

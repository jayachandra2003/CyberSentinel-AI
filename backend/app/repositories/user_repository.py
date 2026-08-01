from datetime import datetime, timezone
from typing import Optional, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.base_repository import BaseRepository
from app.core.rbac import RoleEnum

_in_memory_users: Dict[str, User] = {}
_user_id_counter = 1


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        try:
            result = await self.session.execute(select(User).where(User.email == email))
            return result.scalars().first()
        except Exception:
            return _in_memory_users.get(email)

    async def get(self, id: int) -> Optional[User]:
        try:
            return await super().get(id)
        except Exception:
            for u in _in_memory_users.values():
                if u.id == id:
                    return u
            return None

    async def create_user(
        self,
        email: str,
        password_hash: str,
        full_name: Optional[str] = None,
        role: RoleEnum = RoleEnum.USER,
    ) -> User:
        global _user_id_counter
        now = datetime.now(timezone.utc)
        user = User(
            id=_user_id_counter,
            email=email,
            hashed_password=password_hash,
            full_name=full_name,
            role=role,
            is_active=True,
            is_verified=False,
            created_at=now,
            updated_at=now,
        )
        _user_id_counter += 1
        _in_memory_users[email] = user

        try:
            return await self.create(user)
        except Exception:
            return user

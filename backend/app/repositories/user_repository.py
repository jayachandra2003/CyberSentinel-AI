from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.base_repository import BaseRepository
from app.core.rbac import RoleEnum


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def get(self, id: int) -> Optional[User]:
        return await super().get(id)

    async def create_user(
        self,
        email: str,
        password_hash: str,
        full_name: Optional[str] = None,
        role: RoleEnum = RoleEnum.USER,
    ) -> User:
        now = datetime.now(timezone.utc)
        user = User(
            email=email,
            hashed_password=password_hash,
            full_name=full_name,
            role=role,
            is_active=True,
            is_verified=False,
            created_at=now,
            updated_at=now,
        )
        return await self.create(user)

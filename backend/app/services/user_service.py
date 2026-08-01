from typing import Optional
from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.services.base_service import BaseService


class UserService(BaseService):
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        return await self.user_repo.get(user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        return await self.user_repo.get_by_email(email)

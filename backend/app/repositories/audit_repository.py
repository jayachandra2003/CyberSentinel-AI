from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.repositories.base_repository import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuditLog, session)

    async def log_event(
        self,
        action: str,
        resource: str,
        user_id: Optional[int] = None,
        status: str = "SUCCESS",
        ip_address: Optional[str] = None,
        details_json: Optional[str] = None,
    ) -> AuditLog:
        log_entry = AuditLog(
            action=action,
            resource=resource,
            user_id=user_id,
            status=status,
            ip_address=ip_address,
            details_json=details_json,
        )
        return await self.create(log_entry)

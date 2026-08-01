from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.repositories.base_repository import BaseRepository

_in_memory_audit_logs = []
_audit_id_counter = 1


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuditLog, session)

    async def log_event(
        self,
        action: str,
        resource: str,
        user_id: int | None = None,
        status: str = "SUCCESS",
        ip_address: str | None = None,
        details_json: str | None = None,
    ) -> AuditLog:
        global _audit_id_counter
        log_entry = AuditLog(
            id=_audit_id_counter,
            action=action,
            resource=resource,
            user_id=user_id,
            status=status,
            ip_address=ip_address,
            details_json=details_json,
        )
        _audit_id_counter += 1
        _in_memory_audit_logs.append(log_entry)

        try:
            return await self.create(log_entry)
        except Exception:
            return log_entry

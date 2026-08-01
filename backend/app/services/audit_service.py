from typing import Optional
from app.repositories.audit_repository import AuditRepository
from app.models.audit_log import AuditLog
from app.services.base_service import BaseService


class AuditService(BaseService):
    def __init__(self, audit_repo: AuditRepository):
        self.audit_repo = audit_repo

    async def log_event(
        self,
        action: str,
        resource: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        status: str = "SUCCESS",
        details_json: Optional[str] = None,
    ) -> AuditLog:
        return await self.audit_repo.log_event(
            action=action,
            resource=resource,
            user_id=user_id,
            status=status,
            ip_address=ip_address,
            details_json=details_json,
        )

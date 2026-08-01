from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource: str
    ip_address: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

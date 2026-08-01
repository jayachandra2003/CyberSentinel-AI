from datetime import datetime
from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseMeta(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[str] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


class HealthResponse(BaseModel):
    status: str = "healthy"
    database: str = "connected"
    redis: str = "connected"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VersionResponse(BaseModel):
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    environment: str = "development"

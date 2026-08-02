from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    remember_me: Optional[bool] = False


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class SessionResponse(BaseModel):
    session_uuid: str
    device_name: Optional[str] = "Desktop Browser"
    login_method: str = "PASSWORD"
    login_source: Optional[str] = "web"
    remember_device: bool = False
    created_at: datetime
    last_activity: datetime
    last_refresh_at: datetime
    expires_at: datetime
    is_active: bool = True
    current_session: bool = False

    class Config:
        from_attributes = True


class RevokeSessionRequest(BaseModel):
    session_uuid: str

from sqlalchemy import String, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class ScanTarget(BaseModel):
    __tablename__ = "scan_targets"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    target_url: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    verification_token: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="scan_targets")
    scans = relationship("Scan", back_populates="target", cascade="all, delete-orphan")

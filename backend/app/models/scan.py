from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import String, Enum as SQLEnum, ForeignKey, Integer, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class ScanStatusEnum(str, Enum):
    PENDING = "Pending"
    QUEUED = "Queued"
    RUNNING = "Running"
    COMPLETED = "Completed"
    FAILED = "Failed"


class Scan(BaseModel):
    __tablename__ = "scans"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    target_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("scan_targets.id"), nullable=True)
    target_domain: Mapped[str] = mapped_column(String(255), nullable=False, default="example.com")
    scan_type: Mapped[str] = mapped_column(String(50), default="Quick Scan", nullable=False)
    status: Mapped[ScanStatusEnum] = mapped_column(
        SQLEnum(ScanStatusEnum), default=ScanStatusEnum.PENDING, nullable=False
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="Defensive scan initialized")

    user = relationship("User", back_populates="scans")
    target = relationship("ScanTarget", back_populates="scans")
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")

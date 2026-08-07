"""
Scan ORM Model — Phase 3.2.1 update adds module_results column.

module_results stores a JSON blob keyed by module_id:
{
  "dns": { ...DnsScanResult.model_dump() },
  "ssl": { ... },   # future
  ...
}

The column is TEXT (stored as JSON string) with a runtime property that
serialises/deserialises transparently.  Using TEXT rather than a database-
specific JSON column keeps the model portable across PostgreSQL and the
in-memory fallback.
"""
import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from sqlalchemy import String, Enum as SQLEnum, ForeignKey, Integer, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class ScanStatusEnum(str, Enum):
    PENDING = "Pending"
    QUEUED = "Queued"
    RUNNING = "Running"
    COMPLETED = "Completed"
    FAILED = "Failed"
    CANCELLED = "Cancelled"


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

    # Stores serialised module result payloads as a JSON string.
    # Keys are module_id values (e.g. "dns"). Value is the full module output dict.
    _module_results_json: Mapped[Optional[str]] = mapped_column(
        "module_results", Text, nullable=True, default=None
    )

    user = relationship("User", back_populates="scans")
    target = relationship("ScanTarget", back_populates="scans")
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")

    # ------------------------------------------------------------------
    # Python-level property that transparently marshals the JSON column
    # ------------------------------------------------------------------

    @property
    def module_results(self) -> Dict[str, Any]:
        """Return the module results dict (never None — returns {} if unset)."""
        if not self._module_results_json:
            return {}
        try:
            return json.loads(self._module_results_json)
        except (json.JSONDecodeError, TypeError):
            return {}

    @module_results.setter
    def module_results(self, value: Dict[str, Any]) -> None:
        """Accept a dict and serialise it into the JSON text column."""
        if value is None:
            self._module_results_json = None
        else:
            self._module_results_json = json.dumps(value, default=str)

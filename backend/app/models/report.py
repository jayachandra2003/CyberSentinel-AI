from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class Report(BaseModel):
    __tablename__ = "reports"

    scan_id: Mapped[int] = mapped_column(Integer, ForeignKey("scans.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="PDF", nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)

    scan = relationship("Scan", back_populates="reports")

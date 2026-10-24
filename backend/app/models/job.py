"""
Model: job eksekusi tool Red Team.
Lifecycle: QUEUED -> RUNNING -> COMPLETED / FAILED / CANCELLED
Setiap job WAJIB tertaut ke aset yang sudah diotorisasi (asset_id) -- tidak ada
job yang boleh menunjuk target di luar Asset Inventory. Ini ditegakkan di
JobManager, bukan cuma di schema.
"""
import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tool_id: Mapped[str] = mapped_column(String(100), nullable=False)  # mis. "nmap"
    scenario: Mapped[str | None] = mapped_column(String(255), nullable=True)
    asset_id: Mapped[str] = mapped_column(String(36), ForeignKey("assets.id"), nullable=False)
    # Parameter tervalidasi, disimpan sebagai JSON text ringkas (bukan command mentah).
    parameters_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), nullable=False, default=JobStatus.QUEUED)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

"""Model: riwayat scan GitHub Exposure Monitor (per repo per run)."""
import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GithubScanStatus(str, enum.Enum):
    NOT_CONFIGURED = "not_configured"   # GITHUB_TOKEN kosong
    REJECTED_SCOPE = "rejected_scope"   # repo tidak ada di allowlist
    ERROR = "error"                     # gagal panggil GitHub API
    COMPLETED = "completed"             # berhasil, findings (jika ada) sudah tersimpan


class GithubScanRun(Base):
    __tablename__ = "github_scan_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    repo: Mapped[str] = mapped_column(String(255), nullable=False)  # "owner/name"
    status: Mapped[GithubScanStatus] = mapped_column(Enum(GithubScanStatus), nullable=False)
    files_scanned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

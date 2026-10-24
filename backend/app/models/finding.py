"""Model: temuan generik lintas workspace (IP Intelligence, OSINT, GitHub Exposure)."""
import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FindingCategory(str, enum.Enum):
    IP_REPUTATION = "ip_reputation"
    OSINT = "osint"
    SECRET_EXPOSURE = "secret_exposure"
    OTHER = "other"


class FindingStatus(str, enum.Enum):
    OPEN = "open"
    TRIAGED = "triaged"
    REMEDIATED = "remediated"
    FALSE_POSITIVE = "false_positive"


class Finding(Base):
    __tablename__ = "findings"
    __table_args__ = (
        Index("ix_findings_category_status", "category", "status"),
        # Mencegah duplikasi temuan identik dari sumber & lokasi yang sama.
        Index("ix_findings_dedupe_key", "dedupe_key", unique=True),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    category: Mapped[FindingCategory] = mapped_column(Enum(FindingCategory), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Hanya metadata & nilai yang sudah diredaksi — TIDAK PERNAH menyimpan secret mentah.
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="low")  # low/medium/high
    status: Mapped[FindingStatus] = mapped_column(Enum(FindingStatus), nullable=False, default=FindingStatus.OPEN)
    # Kunci unik untuk deduplikasi, dibentuk dari (category + source + identifier inti).
    dedupe_key: Mapped[str] = mapped_column(String(300), nullable=False)

    collected_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

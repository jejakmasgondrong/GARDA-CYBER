"""Model: aset yang diotorisasi untuk dipantau/dinilai."""
import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AssetType(str, enum.Enum):
    DOMAIN = "domain"
    IP = "ip"
    APPLICATION = "application"
    DEVICE = "device"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_REVIEW = "pending_review"


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(Enum(AssetType), nullable=False, default=AssetType.OTHER)
    identifier: Mapped[str] = mapped_column(String(255), nullable=False)  # domain/IP/nama aplikasi
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scope_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[AssetStatus] = mapped_column(Enum(AssetStatus), nullable=False, default=AssetStatus.PENDING_REVIEW)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

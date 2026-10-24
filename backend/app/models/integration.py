"""Model: registry status konfigurasi tiap integrasi tool eksternal."""
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IntegrationStatus(str, enum.Enum):
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    ERROR = "error"


class IntegrationRegistryEntry(Base):
    __tablename__ = "integration_registry"

    # slug tool, mis. "nmap", "owasp_zap" — dipakai sebagai primary key karena satu baris per tool
    tool_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(IntegrationStatus), nullable=False, default=IntegrationStatus.NOT_CONFIGURED
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

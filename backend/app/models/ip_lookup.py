"""Model: riwayat pencarian IP Intelligence. Tidak menyimpan data pribadi yang tidak perlu."""
import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IpClassification(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    LOOPBACK = "loopback"
    LINK_LOCAL = "link_local"
    MULTICAST = "multicast"
    RESERVED = "reserved"
    UNSPECIFIED = "unspecified"


class ProviderResultStatus(str, enum.Enum):
    OK = "ok"
    NOT_CONFIGURED = "not_configured"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    PROVIDER_ERROR = "provider_error"


class IpLookup(Base):
    __tablename__ = "ip_lookups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)  # cukup untuk IPv4 & IPv6
    classification: Mapped[IpClassification] = mapped_column(Enum(IpClassification), nullable=False)
    provider_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_status: Mapped[ProviderResultStatus] = mapped_column(
        Enum(ProviderResultStatus), nullable=False, default=ProviderResultStatus.NOT_CONFIGURED
    )
    # Hasil provider disimpan sebagai teks ringkas (bukan dump mentah tak terbatas).
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

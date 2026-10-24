"""Model: riwayat lookup OSINT domain (DNS + TLS cert publik). Hasil mentah
dibatasi ukurannya sebelum disimpan -- bukan dump tak terbatas."""
import uuid
import enum
from datetime import datetime

from sqlalchemy import String, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OsintLookupStatus(str, enum.Enum):
    OK = "ok"                      # DNS + (opsional) TLS berhasil
    PARTIAL = "partial"            # DNS berhasil, TLS gagal/dilewati
    BLOCKED = "blocked"            # domain resolve ke IP non-publik -> ditolak (anti-SSRF)
    DNS_ERROR = "dns_error"        # domain tidak bisa di-resolve sama sekali
    INVALID_INPUT = "invalid_input"


class OsintLookup(Base):
    __tablename__ = "osint_lookups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[OsintLookupStatus] = mapped_column(Enum(OsintLookupStatus), nullable=False)
    # Hasil disimpan sebagai JSON teks ringkas (records DNS, info TLS, pesan error).
    dns_records_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    tls_info_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

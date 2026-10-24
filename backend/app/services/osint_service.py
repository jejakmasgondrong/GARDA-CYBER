"""Orkestrasi OSINT: validasi domain -> DNS (anti-SSRF) -> TLS (opsional) -> simpan history."""
import json

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.osint_lookup import OsintLookup, OsintLookupStatus
from app.repositories.osint_lookup import OsintLookupRepository
from app.services.audit_service import record_audit_event
from app.services.osint_dns_service import (
    DnsResolutionError, InvalidDomainError, UnsafeResolutionError, full_dns_lookup, validate_domain,
)
from app.services.osint_tls_service import TlsFetchError, fetch_tls_certificate


class OsintService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = OsintLookupRepository(db)
        self.settings = get_settings()

    def lookup_domain(self, raw_domain: str, actor: str = "system") -> OsintLookup:
        try:
            domain = validate_domain(raw_domain)
        except InvalidDomainError as exc:
            record = OsintLookup(
                domain=raw_domain[:255], status=OsintLookupStatus.INVALID_INPUT, error_message=str(exc),
            )
            return self.repo.create(record)

        try:
            dns_result = full_dns_lookup(
                domain, self.settings.OSINT_DNS_TIMEOUT_SECONDS, self.settings.OSINT_MAX_TXT_RECORDS
            )
        except UnsafeResolutionError as exc:
            record = OsintLookup(domain=domain, status=OsintLookupStatus.BLOCKED, error_message=str(exc))
            created = self.repo.create(record)
            record_audit_event(
                self.db, actor=actor, action="osint.lookup.blocked", target=domain,
                outcome="blocked", detail="Domain resolve ke IP non-publik -- lookup ditolak (anti-SSRF).",
            )
            return created
        except DnsResolutionError as exc:
            record = OsintLookup(domain=domain, status=OsintLookupStatus.DNS_ERROR, error_message=str(exc))
            return self.repo.create(record)

        dns_json = json.dumps({
            "addresses": [{"ip": a.ip, "type": a.record_type} for a in dns_result.addresses],
            "mx": dns_result.mx, "ns": dns_result.ns, "txt": dns_result.txt,
        })

        tls_json = None
        status = OsintLookupStatus.OK
        error_message = None
        try:
            # Konek TLS cuma ke IP A-record pertama yang SUDAH divalidasi publik di atas.
            first_ipv4 = next((a.ip for a in dns_result.addresses if a.record_type == "A"), None)
            target_ip = first_ipv4 or dns_result.addresses[0].ip
            tls_info = fetch_tls_certificate(domain, target_ip, self.settings.OSINT_TLS_TIMEOUT_SECONDS)
            tls_json = json.dumps({
                "subject": tls_info.subject, "issuer": tls_info.issuer,
                "not_before": tls_info.not_before, "not_after": tls_info.not_after, "san": tls_info.san,
            })
        except TlsFetchError as exc:
            status = OsintLookupStatus.PARTIAL
            error_message = f"DNS berhasil, TLS gagal: {exc}"

        record = OsintLookup(
            domain=domain, status=status, dns_records_json=dns_json,
            tls_info_json=tls_json, error_message=error_message, requested_by=actor,
        )
        created = self.repo.create(record)
        record_audit_event(self.db, actor=actor, action="osint.lookup.completed", target=domain, detail=status.value)
        return created

    def list_history(self, skip: int = 0, limit: int = 50) -> tuple[list[OsintLookup], int]:
        limit = max(1, min(limit, 200))
        return self.repo.list_history(skip, limit)

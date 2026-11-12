import json
from urllib.parse import urlparse

from app.core.config import get_settings
from app.integrations.adapters.base import BaseIntegrationAdapter, ExecutionResult, IntegrationInfo
from app.services.osint_dns_service import (
    DnsResolutionError, InvalidDomainError, UnsafeResolutionError, full_dns_lookup, validate_domain,
)
from app.services.osint_tls_service import TlsFetchError, fetch_tls_certificate


class OsintAdapter(BaseIntegrationAdapter):
    """OSINT Domain Intelligence: DNS (A/AAAA/MX/NS/TXT) + TLS cert publik.

    Diimplementasikan di app/services/osint_dns_service.py (resolusi + enforcement
    anti-SSRF/DNS-rebinding) dan app/services/osint_tls_service.py (TLS cert fetch
    yang hanya konek ke IP yang sudah divalidasi publik). Tidak butuh API key
    eksternal -- selalu "configured" karena memakai resolver DNS sistem.
    """

    info = IntegrationInfo(
        tool_id="osint_domain",
        display_name="OSINT Domain Intelligence",
        description="Lookup DNS (A/AAAA/MX/NS/TXT) dan info sertifikat TLS publik untuk domain, dengan enforcement anti-SSRF di backend.",
        official_repo="(tidak ada upstream tunggal -- memakai dnspython + ssl/socket stdlib)",
        required_env_vars=["OSINT_DNS_TIMEOUT_SECONDS", "OSINT_TLS_TIMEOUT_SECONDS", "OSINT_MAX_TXT_RECORDS"],
        capability_summary="DNS & TLS cert lookup untuk domain publik (anti-SSRF enforced)",
        implemented=True,
    )

    def is_configured(self) -> bool:
        return True  # tidak butuh credential eksternal untuk berfungsi

    def execute(self, asset_identifier: str, parameters: dict,
                timeout_seconds: int = 60) -> ExecutionResult:
        """Lookup DNS + TLS nyata. Anti-SSRF dijalankan dns service (resolve -> publik saja)."""
        settings = get_settings()
        raw = (asset_identifier or "").strip()
        if "://" in raw:
            raw = urlparse(raw).hostname or raw
        try:
            domain = validate_domain(raw)
        except InvalidDomainError as exc:
            return ExecutionResult(False, f"Domain tidak valid: {exc}")

        try:
            dns = full_dns_lookup(domain, settings.OSINT_DNS_TIMEOUT_SECONDS, settings.OSINT_MAX_TXT_RECORDS)
        except UnsafeResolutionError as exc:
            return ExecutionResult(False, f"Ditolak (anti-SSRF): {exc}")
        except DnsResolutionError as exc:
            return ExecutionResult(False, f"DNS gagal: {exc}")

        lines = [
            f"osint_domain [{domain}]: {len(dns.addresses)} alamat, "
            f"{len(dns.mx)} MX, {len(dns.ns)} NS, {len(dns.txt)} TXT.",
        ]
        if dns.addresses:
            lines.append("Alamat: " + ", ".join(f"{a.ip} ({a.record_type})" for a in dns.addresses))
        if dns.mx:
            lines.append("MX: " + ", ".join(dns.mx))
        first = next((a.ip for a in dns.addresses if a.record_type in ("A", "AAAA")), None)
        if first:
            try:
                tls = fetch_tls_certificate(domain, first, settings.OSINT_TLS_TIMEOUT_SECONDS)
                lines.append(f"TLS: {tls.subject} oleh {tls.issuer}; berlaku {tls.not_before} s.d. {tls.not_after}.")
            except TlsFetchError as exc:
                lines.append(f"DNS berhasil, TLS gagal: {exc}.")
        else:
            lines.append("TLS: tidak diambil (tanpa catatan A/AAAA).")

        raw_output = json.dumps({
            "domain": domain,
            "addresses": [{"ip": a.ip, "type": a.record_type} for a in dns.addresses],
            "mx": dns.mx, "ns": dns.ns, "txt": dns.txt,
        }, ensure_ascii=False)
        return ExecutionResult(True, "\n".join(lines), raw_output)

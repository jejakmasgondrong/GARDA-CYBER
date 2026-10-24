from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


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

from app.core.config import get_settings
from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class IpReputationAdapter(BaseIntegrationAdapter):
    """Entri registry untuk provider IP Intelligence (lihat
    app/integrations/providers/ untuk implementasi provider).
    """

    info = IntegrationInfo(
        tool_id="ip_reputation",
        display_name="IP Reputation Provider",
        description="Lookup klasifikasi & reputasi IP publik via AbuseIPDB API v2. Fallback ke provider demo jika API key tidak diset.",
        official_repo="https://www.abuseipdb.com/",
        required_env_vars=["ABUSEIPDB_API_KEY"],
        capability_summary="IP classification (selalu aktif) + reputasi eksternal (AbuseIPDB / demo fallback)",
        implemented=True,
    )

    def is_configured(self) -> bool:
        return bool(get_settings().ABUSEIPDB_API_KEY.strip())

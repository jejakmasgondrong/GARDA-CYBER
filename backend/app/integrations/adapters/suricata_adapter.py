from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class SuricataAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="suricata",
        display_name="Suricata",
        description="IDS/IPS berbasis jaringan untuk deteksi pola serangan.",
        official_repo="https://github.com/OISF/suricata",
        required_env_vars=[],  # belum ada kontrak konfigurasi resmi di Tahap 1
        capability_summary="Network intrusion detection",
    )

    def is_configured(self) -> bool:
        # Belum ada mekanisme konfigurasi di Tahap 1 -> selalu belum terkonfigurasi.
        return False

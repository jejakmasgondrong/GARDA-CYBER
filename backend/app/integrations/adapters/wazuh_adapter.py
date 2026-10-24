from app.core.config import get_settings
from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class WazuhAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="wazuh",
        display_name="Wazuh",
        description="Platform deteksi dan respons untuk alert serta telemetry endpoint.",
        official_repo="https://github.com/wazuh/wazuh",
        required_env_vars=["WAZUH_API_URL", "WAZUH_API_USER", "WAZUH_API_PASSWORD"],
        capability_summary="SIEM / endpoint detection",
    )

    def is_configured(self) -> bool:
        s = get_settings()
        return bool(s.WAZUH_API_URL and s.WAZUH_API_USER and s.WAZUH_API_PASSWORD)

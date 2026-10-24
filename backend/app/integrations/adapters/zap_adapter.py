from app.core.config import get_settings
from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class ZapAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="owasp_zap",
        display_name="OWASP ZAP",
        description="Pengujian keamanan aplikasi web untuk aset yang sudah diotorisasi.",
        official_repo="https://github.com/zaproxy/zaproxy",
        required_env_vars=["OWASP_ZAP_URL", "OWASP_ZAP_API_KEY"],
        capability_summary="Web application security testing",
    )

    def is_configured(self) -> bool:
        s = get_settings()
        return bool(s.OWASP_ZAP_URL and s.OWASP_ZAP_API_KEY)

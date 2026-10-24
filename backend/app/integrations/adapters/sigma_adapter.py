from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class SigmaAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="sigma",
        display_name="Sigma Rules",
        description="Format aturan deteksi generik untuk dipetakan ke SIEM yang dipakai.",
        official_repo="https://github.com/SigmaHQ/sigma",
        required_env_vars=[],
        capability_summary="Detection rule management",
    )

    def is_configured(self) -> bool:
        return False

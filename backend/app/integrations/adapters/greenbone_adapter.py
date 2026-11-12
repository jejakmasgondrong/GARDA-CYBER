from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class GreenboneAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="greenbone",
        display_name="Greenbone (OpenVAS)",
        description="Penilaian kerentanan untuk aset yang sudah diotorisasi.",
        official_repo="https://github.com/greenbone",
        required_env_vars=[],
        capability_summary="Vulnerability assessment",
        locked=True,
        locked_note="fitur locked, silahkan hubungi tim Luzsec 1",
    )

    def is_configured(self) -> bool:
        return False

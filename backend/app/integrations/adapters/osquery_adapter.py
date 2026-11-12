from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class OsqueryAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="osquery",
        display_name="osquery",
        description="Telemetry endpoint berbasis query SQL untuk visibilitas sistem.",
        official_repo="https://github.com/osquery/osquery",
        required_env_vars=[],
        capability_summary="Endpoint telemetry",
        locked=True,
        locked_note="fitur locked, silahkan hubungi tim Luzsec 1",
    )

    def is_configured(self) -> bool:
        return False

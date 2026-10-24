
from app.core.config import get_settings
from app.integrations.adapters.base import BaseIntegrationAdapter, IntegrationInfo


class GithubExposureAdapter(BaseIntegrationAdapter):
    """Memeriksa pola kredensial pada repositori yang diizinkan."""

    info = IntegrationInfo(
        tool_id="github_exposure",
        display_name="GitHub Exposure Monitor",
        description=(
            "Memeriksa repo yang diizinkan untuk pola kredensial/API key "
            "yang terekspos. Hasil diredaksi sebelum disimpan."
        ),
        official_repo="https://github.com/github/rest-api-description",
        required_env_vars=[
            "GITHUB_TOKEN",
            "GITHUB_EXPOSURE_ALLOWED_REPOS",
        ],
        capability_summary=(
            "Secret-pattern scanning pada repo yang diizinkan, "
            "dengan redaksi otomatis"
        ),
        implemented=True,
    )

    def is_configured(self) -> bool:
        settings = get_settings()
        return bool(
            settings.GITHUB_TOKEN.strip()
            and settings.github_allowed_repos_list
        )

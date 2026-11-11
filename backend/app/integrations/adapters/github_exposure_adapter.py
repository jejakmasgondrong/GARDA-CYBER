
import json

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.integrations.adapters.base import BaseIntegrationAdapter, ExecutionResult, IntegrationInfo
from app.models.github_scan import GithubScanStatus
from app.services.github_exposure_service import GithubExposureService


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

    def execute(self, asset_identifier: str, parameters: dict, timeout_seconds: int = 60) -> ExecutionResult:
        """Scan repo via GithubExposureService.scan_repo.

        Repo target dibaca dari parameters["repo"] (bukan asset_identifier),
        karena satu asset bisa dipakai untuk scan repo berbeda. Session dibuat
        sendiri karena JobManager memanggil execute() tanpa db session.
        """
        raw_repo = (parameters or {}).get("repo")
        if not isinstance(raw_repo, str) or not raw_repo.strip():
            return ExecutionResult(
                success=False,
                summary="Parameter 'repo' wajib diisi (format 'owner/nama-repo').",
            )
        repo = raw_repo.strip()

        db = SessionLocal()
        try:
            run = GithubExposureService(db).scan_repo(repo, actor="job_manager")
            # Ekstrak SEMUA field sebelum session ditutup -- instance ORM tidak
            # boleh diakses setelah db.close() (DetachedInstanceError).
            run_repo = run.repo
            run_status = run.status
            run_files = run.files_scanned
            run_findings = run.findings_created
            run_error = run.error_message
        except Exception as exc:  # service TIDAK BOLEH membuat job endpoint 500
            return ExecutionResult(success=False, summary=f"Scan gagal: {exc.__class__.__name__}")
        finally:
            db.close()

        excerpt = json.dumps(
            {
                "repo": run_repo,
                "status": run_status.value,
                "files_scanned": run_files,
                "findings_created": run_findings,
                "error_message": run_error,
            },
            ensure_ascii=False,
        )

        if run_status == GithubScanStatus.COMPLETED:
            return ExecutionResult(
                success=True,
                summary=(
                    f"Scan selesai: {run_files} file diperiksa, "
                    f"{run_findings} finding dibuat."
                ),
                raw_output_excerpt=excerpt,
            )

        error = run_error or run_status.value
        return ExecutionResult(
            success=False,
            summary=f"Scan tidak selesai: {error}.",
            raw_output_excerpt=excerpt,
        )

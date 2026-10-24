"""Orkestrasi GitHub Exposure Monitor.

ATURAN KERAS:
1. Repo yang di-scan HARUS ada di GITHUB_EXPOSURE_ALLOWED_REPOS -- biar token
   punya akses lebih luas pun, aplikasi ini tidak akan scan di luar allowlist
   (defense-in-depth, bukan cuma mengandalkan scope token di GitHub).
2. Isi file lengkap TIDAK PERNAH disimpan -- hanya baris yang match pola,
   dan nilai yang match diredaksi sebelum disimpan sebagai Finding.
3. Token tidak pernah masuk ke Finding, AuditLog, respons API, atau error
   message yang dikembalikan ke klien.
4. File dibatasi jumlah (GITHUB_MAX_FILES_PER_SCAN) dan ukuran
   (GITHUB_MAX_FILE_BYTES) per scan supaya tidak jadi crawler tak terbatas.
"""
from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.github_scan import GithubScanRun, GithubScanStatus
from app.repositories.github_scan import GithubScanRepository
from app.services.audit_service import record_audit_event
from app.services.finding_service import DuplicateFindingError, FindingService
from app.services.github_api_client import GithubApiClient, GithubApiError
from app.services.redaction import redact_secret
from app.services.secret_patterns import scan_content_for_secrets
from app.schemas.finding import FindingCreate

_REPO_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98})/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98})$")

# Hanya file teks yang masuk akal diperiksa -- skip binary/image/lock file besar.
_SCANNABLE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yml", ".yaml", ".env", ".txt",
    ".md", ".toml", ".ini", ".cfg", ".sh", ".ps1", ".java", ".go", ".rb", ".php",
    ".xml", ".properties", ".conf",
}


class InvalidRepoFormatError(ValueError):
    pass


def validate_repo_format(raw: str) -> str:
    repo = raw.strip()
    if not _REPO_RE.match(repo):
        raise InvalidRepoFormatError(f"'{raw}' bukan format repo yang valid (harus 'owner/nama-repo').")
    return repo


class GithubExposureService:
    def __init__(self, db: Session):
        self.db = db
        self.repo_store = GithubScanRepository(db)
        self.finding_service = FindingService(db)
        self.settings = get_settings()

    def status(self) -> dict:
        configured = bool(self.settings.GITHUB_TOKEN) and bool(self.settings.github_allowed_repos_list)
        return {
            "status": "ready" if configured else "not_configured",
            "allowed_repos": self.settings.github_allowed_repos_list if configured else [],
        }

    def scan_repo(self, raw_repo: str, actor: str = "system") -> GithubScanRun:
        try:
            repo = validate_repo_format(raw_repo)
        except InvalidRepoFormatError as exc:
            run = GithubScanRun(repo=raw_repo[:255], status=GithubScanStatus.ERROR, error_message=str(exc))
            return self.repo_store.create(run)

        if not self.settings.GITHUB_TOKEN:
            run = GithubScanRun(
                repo=repo, status=GithubScanStatus.NOT_CONFIGURED,
                error_message="GITHUB_TOKEN belum diisi di .env.",
            )
            return self.repo_store.create(run)

        if repo not in self.settings.github_allowed_repos_list:
            run = GithubScanRun(
                repo=repo, status=GithubScanStatus.REJECTED_SCOPE,
                error_message=f"Repo '{repo}' tidak ada di GITHUB_EXPOSURE_ALLOWED_REPOS.",
            )
            created = self.repo_store.create(run)
            record_audit_event(
                self.db, actor=actor, action="github_exposure.scan.rejected_scope", target=repo,
                outcome="rejected", detail="Repo di luar allowlist.",
            )
            return created

        client = GithubApiClient(self.settings.GITHUB_TOKEN, self.settings.GITHUB_API_TIMEOUT_SECONDS)
        owner, name = repo.split("/", 1)

        try:
            branch = client.get_default_branch(owner, name)
            files = client.list_tree(owner, name, branch)
        except GithubApiError as exc:
            run = GithubScanRun(repo=repo, status=GithubScanStatus.ERROR, error_message=str(exc))
            created = self.repo_store.create(run)
            record_audit_event(self.db, actor=actor, action="github_exposure.scan.error", target=repo, outcome="error")
            return created

        candidates = [
            f for f in files
            if any(f.path.endswith(ext) for ext in _SCANNABLE_EXTENSIONS)
            and 0 < f.size <= self.settings.GITHUB_MAX_FILE_BYTES
        ][: self.settings.GITHUB_MAX_FILES_PER_SCAN]

        files_scanned = 0
        findings_created = 0
        for f in candidates:
            try:
                content = client.get_file_content(owner, name, f.path, branch)
            except GithubApiError:
                continue  # satu file gagal tidak menggagalkan seluruh scan
            files_scanned += 1

            for pattern, matched_text, line_no in scan_content_for_secrets(content):
                redacted = redact_secret(matched_text)
                dedupe_key = f"github:{repo}:{f.path}:{pattern.id}"
                try:
                    self.finding_service.create_finding(
                        FindingCreate(
                            category="secret_exposure",
                            title=f"{pattern.label} terdeteksi di {f.path}",
                            description=f"Baris {line_no}: {redacted}",
                            source="github_exposure",
                            source_url=f"https://github.com/{repo}/blob/{branch}/{f.path}#L{line_no}",
                            confidence="medium",
                            collected_at=run_timestamp(),
                            dedupe_key=dedupe_key,
                        ),
                        actor=actor,
                    )
                    findings_created += 1
                except DuplicateFindingError:
                    pass  # sudah pernah tercatat dari scan sebelumnya -- bukan error

        run = GithubScanRun(
            repo=repo, status=GithubScanStatus.COMPLETED,
            files_scanned=files_scanned, findings_created=findings_created, requested_by=actor,
        )
        created = self.repo_store.create(run)
        record_audit_event(
            self.db, actor=actor, action="github_exposure.scan.completed", target=repo,
            detail=f"files_scanned={files_scanned} findings_created={findings_created}",
        )
        return created

    def list_history(self, skip: int = 0, limit: int = 50) -> tuple[list[GithubScanRun], int]:
        limit = max(1, min(limit, 200))
        return self.repo_store.list_history(skip, limit)


def run_timestamp():
    from datetime import datetime
    return datetime.utcnow()

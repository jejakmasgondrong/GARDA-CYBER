from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.github_scan import GithubScanStatus


class GithubScanRequest(BaseModel):
    repo: str  # "owner/name"


class GithubScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repo: str
    status: GithubScanStatus
    files_scanned: int
    findings_created: int
    error_message: str | None
    created_at: datetime


class GithubScanListResponse(BaseModel):
    items: list[GithubScanResponse]
    total: int
    skip: int
    limit: int


class GithubExposureStatusResponse(BaseModel):
    status: str  # "ready" | "not_configured"
    allowed_repos: list[str]

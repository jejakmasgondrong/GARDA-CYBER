from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import JobStatus


class JobCreate(BaseModel):
    tool_id: str = Field(..., examples=["nmap"])
    asset_id: str
    scenario: str | None = None
    # Hanya flag yang di-allowlist per tool yang diterima -- divalidasi di service, bukan di sini.
    parameters: dict = Field(default_factory=dict)


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tool_id: str
    scenario: str | None
    asset_id: str
    status: JobStatus
    output_summary: str | None
    failure_reason: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class JobListResponse(BaseModel):
    items: list[JobRead]
    total: int
    skip: int
    limit: int

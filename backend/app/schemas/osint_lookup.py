from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.osint_lookup import OsintLookupStatus


class OsintLookupRequest(BaseModel):
    domain: str


class OsintLookupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    domain: str
    status: OsintLookupStatus
    dns_records_json: str | None
    tls_info_json: str | None
    error_message: str | None
    created_at: datetime


class OsintLookupListResponse(BaseModel):
    items: list[OsintLookupResponse]
    total: int
    skip: int
    limit: int

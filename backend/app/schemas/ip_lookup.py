from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.ip_lookup import IpClassification, ProviderResultStatus


class IpLookupRequest(BaseModel):
    ip_address: str = Field(..., min_length=2, max_length=45, examples=["8.8.8.8"])


class IpLookupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ip_address: str
    classification: IpClassification
    eligible_for_external_lookup: bool
    provider_id: str | None
    provider_status: ProviderResultStatus
    result_summary: str | None
    created_at: datetime


class IpLookupListResponse(BaseModel):
    items: list[IpLookupResponse]
    total: int
    skip: int
    limit: int

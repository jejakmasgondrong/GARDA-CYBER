from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.finding import FindingCategory, FindingStatus


class FindingBase(BaseModel):
    category: FindingCategory
    title: str
    description: str | None = None
    source: str
    source_url: str | None = None
    confidence: str = "low"
    collected_at: datetime
    case_id: str | None = None
    dedupe_key: str

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: str) -> str:
        if v not in {"low", "medium", "high"}:
            raise ValueError("confidence harus salah satu dari: low, medium, high")
        return v


class FindingCreate(FindingBase):
    pass


class FindingUpdate(BaseModel):
    status: FindingStatus | None = None
    case_id: str | None = None


class FindingRead(FindingBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: FindingStatus
    created_at: datetime
    updated_at: datetime


class FindingListResponse(BaseModel):
    items: list[FindingRead]
    total: int
    skip: int
    limit: int

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.incident import IncidentStatus


class IncidentBase(BaseModel):
    title: str
    summary: str | None = None
    assigned_to: str | None = None


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    status: IncidentStatus | None = None
    assigned_to: str | None = None


class IncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime


class IncidentListResponse(BaseModel):
    items: list[IncidentRead]
    total: int
    skip: int
    limit: int

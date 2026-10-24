from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.asset import AssetType, AssetStatus


class AssetBase(BaseModel):
    name: str
    asset_type: AssetType = AssetType.OTHER
    identifier: str
    owner: str | None = None
    scope_notes: str | None = None
    status: AssetStatus = AssetStatus.PENDING_REVIEW


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: str | None = None
    asset_type: AssetType | None = None
    identifier: str | None = None
    owner: str | None = None
    scope_notes: str | None = None
    status: AssetStatus | None = None


class AssetRead(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertSeverity, AlertStatus


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    source: str
    severity: AlertSeverity
    status: AlertStatus
    asset_id: str | None
    created_at: datetime
    updated_at: datetime

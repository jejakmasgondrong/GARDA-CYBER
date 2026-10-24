from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.integration import IntegrationStatus


class IntegrationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tool_id: str
    display_name: str
    status: IntegrationStatus
    notes: str | None
    updated_at: datetime

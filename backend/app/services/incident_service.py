from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentStatus
from app.repositories.incident import IncidentRepository
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services.audit_service import record_audit_event


class IncidentNotFoundError(ValueError):
    pass


class IncidentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = IncidentRepository(db)

    def list_incidents(
        self, skip: int = 0, limit: int = 50, status: IncidentStatus | None = None
    ) -> tuple[list[Incident], int]:
        limit = max(1, min(limit, 200))
        return self.repo.list_filtered(skip, limit, status)

    def create_incident(self, data: IncidentCreate, actor: str = "system") -> Incident:
        incident = Incident(**data.model_dump())
        created = self.repo.create(incident)
        record_audit_event(self.db, actor=actor, action="incident.created", target=created.id, detail=created.title)
        return created

    def update_incident(self, incident_id: str, data: IncidentUpdate, actor: str = "system") -> Incident:
        incident = self.repo.get(incident_id)
        if incident is None:
            raise IncidentNotFoundError(f"Incident '{incident_id}' tidak ditemukan.")
        changes = data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(incident, field, value)
        updated = self.repo.create(incident)
        record_audit_event(
            self.db, actor=actor, action="incident.updated", target=incident_id,
            detail=f"changes={list(changes.keys())}",
        )
        return updated

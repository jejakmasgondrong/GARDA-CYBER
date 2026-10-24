from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentStatus
from app.repositories.base import BaseRepository


class IncidentRepository(BaseRepository[Incident]):
    def __init__(self, db: Session):
        super().__init__(Incident, db)

    def list_filtered(
        self, skip: int = 0, limit: int = 50, status: IncidentStatus | None = None
    ) -> tuple[list[Incident], int]:
        stmt = select(Incident)
        count_stmt = select(func.count()).select_from(Incident)
        if status is not None:
            stmt = stmt.where(Incident.status == status)
            count_stmt = count_stmt.where(Incident.status == status)
        stmt = stmt.order_by(Incident.created_at.desc()).offset(skip).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        total = self.db.execute(count_stmt).scalar_one()
        return items, total

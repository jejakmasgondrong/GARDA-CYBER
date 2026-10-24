from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.osint_lookup import OsintLookup
from app.repositories.base import BaseRepository


class OsintLookupRepository(BaseRepository[OsintLookup]):
    def __init__(self, db: Session):
        super().__init__(OsintLookup, db)

    def list_history(self, skip: int = 0, limit: int = 50) -> tuple[list[OsintLookup], int]:
        stmt = select(OsintLookup).order_by(OsintLookup.created_at.desc()).offset(skip).limit(limit)
        total = self.db.execute(select(func.count()).select_from(OsintLookup)).scalar_one()
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

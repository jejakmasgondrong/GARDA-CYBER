from sqlalchemy.orm import Session

from app.models.ip_lookup import IpLookup
from app.repositories.base import BaseRepository


class IpLookupRepository(BaseRepository[IpLookup]):
    def __init__(self, db: Session):
        super().__init__(IpLookup, db)

    def count(self) -> int:
        return self.db.query(IpLookup).count()

    def list_paginated(self, skip: int, limit: int) -> list[IpLookup]:
        return (
            self.db.query(IpLookup)
            .order_by(IpLookup.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

from sqlalchemy.orm import Session

from app.models.job import Job
from app.repositories.base import BaseRepository


class JobRepository(BaseRepository[Job]):
    def __init__(self, db: Session):
        super().__init__(Job, db)

    def count(self) -> int:
        return self.db.query(Job).count()

    def list_paginated(self, skip: int, limit: int) -> list[Job]:
        return self.db.query(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()

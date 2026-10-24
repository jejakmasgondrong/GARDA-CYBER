from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.github_scan import GithubScanRun
from app.repositories.base import BaseRepository


class GithubScanRepository(BaseRepository[GithubScanRun]):
    def __init__(self, db: Session):
        super().__init__(GithubScanRun, db)

    def list_history(self, skip: int = 0, limit: int = 50) -> tuple[list[GithubScanRun], int]:
        stmt = select(GithubScanRun).order_by(GithubScanRun.created_at.desc()).offset(skip).limit(limit)
        total = self.db.execute(select(func.count()).select_from(GithubScanRun)).scalar_one()
        return list(self.db.execute(stmt).scalars().all()), total

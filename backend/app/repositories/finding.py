from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.finding import Finding, FindingCategory, FindingStatus
from app.repositories.base import BaseRepository


class FindingRepository(BaseRepository[Finding]):
    def __init__(self, db: Session):
        super().__init__(Finding, db)

    def list_filtered(
        self,
        skip: int = 0,
        limit: int = 50,
        category: FindingCategory | None = None,
        status: FindingStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[Finding], int]:
        stmt = select(Finding)
        count_stmt = select(func.count()).select_from(Finding)
        if category is not None:
            stmt = stmt.where(Finding.category == category)
            count_stmt = count_stmt.where(Finding.category == category)
        if status is not None:
            stmt = stmt.where(Finding.status == status)
            count_stmt = count_stmt.where(Finding.status == status)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(Finding.title.ilike(like))
            count_stmt = count_stmt.where(Finding.title.ilike(like))
        stmt = stmt.order_by(Finding.collected_at.desc()).offset(skip).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        total = self.db.execute(count_stmt).scalar_one()
        return items, total

    def find_by_dedupe_key(self, dedupe_key: str) -> Finding | None:
        stmt = select(Finding).where(Finding.dedupe_key == dedupe_key)
        return self.db.execute(stmt).scalar_one_or_none()

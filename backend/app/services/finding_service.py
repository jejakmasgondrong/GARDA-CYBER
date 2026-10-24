"""Service layer untuk Finding. Dedupe key mencegah temuan identik tercatat berulang."""
from sqlalchemy.orm import Session

from app.models.finding import Finding, FindingCategory, FindingStatus
from app.repositories.finding import FindingRepository
from app.schemas.finding import FindingCreate, FindingUpdate
from app.services.audit_service import record_audit_event


class DuplicateFindingError(ValueError):
    pass


class FindingNotFoundError(ValueError):
    pass


class FindingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FindingRepository(db)

    def list_findings(
        self,
        skip: int = 0,
        limit: int = 50,
        category: FindingCategory | None = None,
        status: FindingStatus | None = None,
        search: str | None = None,
    ) -> tuple[list[Finding], int]:
        limit = max(1, min(limit, 200))
        return self.repo.list_filtered(skip, limit, category, status, search)

    def create_finding(self, data: FindingCreate, actor: str = "system") -> Finding:
        existing = self.repo.find_by_dedupe_key(data.dedupe_key)
        if existing is not None:
            raise DuplicateFindingError(
                f"Finding dengan dedupe_key '{data.dedupe_key}' sudah ada (id={existing.id})."
            )
        finding = Finding(**data.model_dump())
        created = self.repo.create(finding)
        record_audit_event(
            self.db, actor=actor, action="finding.created", target=created.id,
            detail=f"category={created.category.value} source={created.source}",
        )
        return created

    def update_finding(self, finding_id: str, data: FindingUpdate, actor: str = "system") -> Finding:
        finding = self.repo.get(finding_id)
        if finding is None:
            raise FindingNotFoundError(f"Finding '{finding_id}' tidak ditemukan.")
        changes = data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(finding, field, value)
        updated = self.repo.create(finding)  # create() juga commit+refresh untuk obj existing
        record_audit_event(
            self.db, actor=actor, action="finding.updated", target=finding_id,
            detail=f"changes={list(changes.keys())}",
        )
        return updated

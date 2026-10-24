from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.audit_log import AuditLogRepository
from app.schemas.audit_log import AuditLogRead

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)) -> list[AuditLogRead]:
    limit = max(1, min(limit, 200))
    repo = AuditLogRepository(db)
    return repo.list_recent(skip, limit)

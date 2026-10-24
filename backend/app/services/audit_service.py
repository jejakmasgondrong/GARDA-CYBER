"""Helper untuk mencatat audit log. Dipanggil oleh service lain -- TIDAK PERNAH
mencatat header Authorization, token, atau secret mentah di kolom manapun.
"""
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.repositories.audit_log import AuditLogRepository


def record_audit_event(
    db: Session,
    actor: str,
    action: str,
    target: str | None = None,
    outcome: str = "success",
    detail: str | None = None,
) -> AuditLog:
    repo = AuditLogRepository(db)
    entry = AuditLog(actor=actor, action=action, target=target, outcome=outcome, detail=detail)
    return repo.create(entry)

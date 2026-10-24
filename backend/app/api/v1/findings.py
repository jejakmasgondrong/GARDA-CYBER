"""Endpoint Findings. Dipakai lintas workspace (IP Intelligence, OSINT, GitHub Exposure)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.finding import FindingCategory, FindingStatus
from app.schemas.finding import FindingCreate, FindingListResponse, FindingRead, FindingUpdate
from app.services.finding_service import DuplicateFindingError, FindingNotFoundError, FindingService

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=FindingListResponse)
def list_findings(
    skip: int = 0,
    limit: int = 50,
    category: FindingCategory | None = None,
    status: FindingStatus | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
) -> FindingListResponse:
    service = FindingService(db)
    items, total = service.list_findings(skip, limit, category, status, search)
    return FindingListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("", response_model=FindingRead, status_code=201)
def create_finding(payload: FindingCreate, db: Session = Depends(get_db)) -> FindingRead:
    service = FindingService(db)
    try:
        return service.create_finding(payload)
    except DuplicateFindingError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.patch("/{finding_id}", response_model=FindingRead)
def update_finding(finding_id: str, payload: FindingUpdate, db: Session = Depends(get_db)) -> FindingRead:
    service = FindingService(db)
    try:
        return service.update_finding(finding_id, payload)
    except FindingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

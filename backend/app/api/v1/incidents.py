from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.incident import IncidentStatus
from app.schemas.incident import IncidentCreate, IncidentListResponse, IncidentRead, IncidentUpdate
from app.services.incident_service import IncidentNotFoundError, IncidentService

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    skip: int = 0, limit: int = 50, status: IncidentStatus | None = None, db: Session = Depends(get_db)
) -> IncidentListResponse:
    service = IncidentService(db)
    items, total = service.list_incidents(skip, limit, status)
    return IncidentListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("", response_model=IncidentRead, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)) -> IncidentRead:
    service = IncidentService(db)
    return service.create_incident(payload)


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(incident_id: str, payload: IncidentUpdate, db: Session = Depends(get_db)) -> IncidentRead:
    service = IncidentService(db)
    try:
        return service.update_incident(incident_id, payload)
    except IncidentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

"""Endpoint OSINT Domain Intelligence. Tidak pernah mengembalikan stack trace ke klien."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.osint_lookup import OsintLookupListResponse, OsintLookupRequest, OsintLookupResponse
from app.services.osint_service import OsintService

router = APIRouter(prefix="/osint", tags=["osint"])


@router.post("/lookup", response_model=OsintLookupResponse, status_code=201)
def lookup_domain(payload: OsintLookupRequest, db: Session = Depends(get_db)) -> OsintLookupResponse:
    service = OsintService(db)
    # Sengaja tidak melempar HTTPException untuk domain tidak valid/diblokir --
    # itu adalah hasil yang sah (status=invalid_input/blocked), bukan error server.
    return service.lookup_domain(payload.domain)


@router.get("/history", response_model=OsintLookupListResponse)
def lookup_history(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db),
) -> OsintLookupListResponse:
    service = OsintService(db)
    items, total = service.list_history(skip=skip, limit=limit)
    return OsintLookupListResponse(items=items, total=total, skip=skip, limit=limit)

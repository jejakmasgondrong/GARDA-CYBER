"""Endpoint IP Intelligence. Tidak pernah mengembalikan stack trace ke klien."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ip_lookup import IpLookupListResponse, IpLookupRequest, IpLookupResponse
from app.services.ip_classification import InvalidIpAddressError, is_eligible_for_external_lookup
from app.services.ip_lookup_service import IpLookupService

router = APIRouter(prefix="/ip-intelligence", tags=["ip-intelligence"])


def _to_response(record) -> IpLookupResponse:
    return IpLookupResponse(
        id=record.id,
        ip_address=record.ip_address,
        classification=record.classification,
        eligible_for_external_lookup=is_eligible_for_external_lookup(record.classification),
        provider_id=record.provider_id,
        provider_status=record.provider_status,
        result_summary=record.result_summary,
        created_at=record.created_at,
    )


@router.post("/lookup", response_model=IpLookupResponse, status_code=201)
def lookup_ip(payload: IpLookupRequest, db: Session = Depends(get_db)) -> IpLookupResponse:
    service = IpLookupService(db)
    try:
        record = service.lookup(payload.ip_address)
    except InvalidIpAddressError as exc:
        # Pesan error aman: tidak membocorkan path internal/stack trace.
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _to_response(record)


@router.get("/history", response_model=IpLookupListResponse)
def lookup_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> IpLookupListResponse:
    service = IpLookupService(db)
    items, total = service.list_history(skip=skip, limit=limit)
    return IpLookupListResponse(items=[_to_response(i) for i in items], total=total, skip=skip, limit=limit)

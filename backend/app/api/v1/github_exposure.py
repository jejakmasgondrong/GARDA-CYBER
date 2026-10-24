"""Endpoint GitHub Exposure Monitor. Tidak pernah mengembalikan token/header di respons."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.github_scan import (
    GithubExposureStatusResponse, GithubScanListResponse, GithubScanRequest, GithubScanResponse,
)
from app.services.github_exposure_service import GithubExposureService

router = APIRouter(prefix="/github-exposure", tags=["github-exposure"])


@router.get("/status", response_model=GithubExposureStatusResponse)
def get_status(db: Session = Depends(get_db)) -> GithubExposureStatusResponse:
    return GithubExposureService(db).status()


@router.post("/scan", response_model=GithubScanResponse, status_code=201)
def scan_repo(payload: GithubScanRequest, db: Session = Depends(get_db)) -> GithubScanResponse:
    service = GithubExposureService(db)
    # Tidak melempar HTTPException untuk repo invalid/di luar scope -- itu hasil
    # sah (status ERROR/REJECTED_SCOPE), bukan error server.
    return service.scan_repo(payload.repo)


@router.get("/scans", response_model=GithubScanListResponse)
def scan_history(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db),
) -> GithubScanListResponse:
    service = GithubExposureService(db)
    items, total = service.list_history(skip, limit)
    return GithubScanListResponse(items=items, total=total, skip=skip, limit=limit)

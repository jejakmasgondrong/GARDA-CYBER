"""Endpoint Job Manager. Error yang berasal dari scope validation dikembalikan sebagai 422, bukan 500."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.job import JobCreate, JobListResponse, JobRead
from app.services.job_manager import JobManagerService, ScopeViolationError

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobRead, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> JobRead:
    service = JobManagerService(db)
    try:
        job = service.create_and_run(payload)
    except ScopeViolationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return job


@router.get("", response_model=JobListResponse)
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> JobListResponse:
    service = JobManagerService(db)
    items, total = service.list_jobs(skip=skip, limit=limit)
    return JobListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: str, db: Session = Depends(get_db)) -> JobRead:
    service = JobManagerService(db)
    job = service.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan.")
    return job


@router.post("/{job_id}/cancel", response_model=JobRead)
def cancel_job(job_id: str, db: Session = Depends(get_db)) -> JobRead:
    service = JobManagerService(db)
    job = service.cancel(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan.")
    return job

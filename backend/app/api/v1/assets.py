"""Endpoint Asset Inventory. Tahap 1: list + create saja (fondasi)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.asset import AssetCreate, AssetRead
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetRead])
def list_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)) -> list[AssetRead]:
    service = AssetService(db)
    return service.list_assets(skip=skip, limit=limit)


@router.post("", response_model=AssetRead, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db)) -> AssetRead:
    service = AssetService(db)
    return service.create_asset(payload)

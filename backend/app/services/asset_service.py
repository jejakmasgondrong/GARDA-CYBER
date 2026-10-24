"""
Service layer untuk Asset. Tahap 1: operasi dasar (create/list).
Validasi bisnis lanjutan (mis. cek duplikasi identifier, approval scope)
disiapkan untuk Tahap 3.
"""
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.repositories.asset import AssetRepository
from app.schemas.asset import AssetCreate


class AssetService:
    def __init__(self, db: Session):
        self.repo = AssetRepository(db)

    def list_assets(self, skip: int = 0, limit: int = 100) -> list[Asset]:
        return self.repo.list(skip=skip, limit=limit)

    def create_asset(self, data: AssetCreate) -> Asset:
        asset = Asset(**data.model_dump())
        return self.repo.create(asset)

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.repositories.base import BaseRepository


class AssetRepository(BaseRepository[Asset]):
    def __init__(self, db: Session):
        super().__init__(Asset, db)

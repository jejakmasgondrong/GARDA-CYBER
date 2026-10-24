"""Endpoint status integrasi tool eksternal (bukan eksekusi scan)."""
from fastapi import APIRouter

from app.integrations.registry import list_integration_statuses

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("")
def get_integration_statuses() -> list[dict]:
    return list_integration_statuses()

"""Router gabungan untuk /api/v1."""
from fastapi import APIRouter

from app.api.v1 import (
    health, assets, integrations, ip_intelligence, findings, incidents, audit_logs, osint, github_exposure, jobs,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(assets.router)
api_router.include_router(integrations.router)
api_router.include_router(ip_intelligence.router)
api_router.include_router(findings.router)
api_router.include_router(incidents.router)
api_router.include_router(audit_logs.router)
api_router.include_router(osint.router)
api_router.include_router(github_exposure.router)
api_router.include_router(jobs.router)

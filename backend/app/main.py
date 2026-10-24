
"""Entry point aplikasi GARDA CYBER (backend)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine
import app.db.models  # noqa: F401


settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="GARDA CYBER — Security Operations Platform (Tahap 1: fondasi).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    # Membuat tabel jika belum ada; tidak menghapus tabel yang sudah ada.
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root() -> dict:
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "docs": "/docs",
    }

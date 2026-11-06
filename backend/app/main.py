"""Entry point aplikasi GARDA CYBER (backend)."""

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine, get_db
import app.db.models   # noqa: F401
from app.db.security_log import SecurityLog

settings = get_settings()
configure_logging()

# Path absolut supaya static files tetap ketemu walau proses dijalankan dari CWD lain.
APP_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="GARDA CYBER — Security Operations Platform.",
)

# ==========================================
# KONFIGURASI STATIC FILES (REACT)
# ==========================================
# 1. Serve file JS/CSS React yang ada di /assets
# Serve folder assets React di root (agar JS & CSS terbaca)
app.mount("/assets", StaticFiles(directory=APP_DIR / "dist" / "assets"), name="assets")

# Serve file HTML statis lainnya
app.mount("/static", StaticFiles(directory=APP_DIR / "dist"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


# ==========================================
# 1. INFO LAYANAN
# ==========================================
@app.get("/")
async def root() -> dict:
    """Info layanan. Tidak mencatat IP/geolokasi pengunjung."""
    return {
        "service": settings.APP_NAME,
        "status": "ok",
        "docs": "/docs",
        "dashboard": "/static/index.html",
    }


# ==========================================
# 2. API BLUE TEAM (baca-saja, tanpa kredensial)
# ==========================================
@app.get("/api/v1/logs")
async def get_logs(db: Session = Depends(get_db)):
    """50 log akses terakhir.

    Tabel ini sengaja hanya menyimpan metadata akses (IP, kota, ISP, waktu).
    Kolom email/password sudah dihapus: mengumpulkan kredensial pengguna
    bukan fungsi platform ini.
    """
    return db.query(SecurityLog).order_by(SecurityLog.id.desc()).limit(50).all()

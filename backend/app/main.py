"""Entry point aplikasi GARDA CYBER (backend)."""

from datetime import datetime
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import SessionLocal, engine, get_db
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

# Endpoint yang tetap terbuka walau API_KEY diisi: dokumen API, aset statis,
# dan pemeriksaan kesehatan (dipakai pemantau/load balancer).
AUTH_EXEMPT_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/api/v1/health", "/api/v1/ready"}
AUTH_EXEMPT_PREFIXES = ("/static", "/assets")

# Endpoint yang tidak dicatat sebagai access log: terlalu berisik / tidak berguna.
LOG_SKIP_PREFIXES = ("/static", "/assets", "/docs", "/redoc", "/openapi.json")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    """Tolak permintaan tanpa X-API-Key kalau API_KEY diisi.

    Kenapa perlu: endpoint /jobs bisa menjalankan probe ke target mana pun yang
    terdaftar. Tanpa penjagaan, siapa pun yang menjangkau port ini bisa memakainya.
    Kosongkan API_KEY hanya kalau benar-benar dipakai lokal.
    """
    if settings.API_KEY:
        path = request.url.path
        protected = path.startswith("/api/v1") and path not in AUTH_EXEMPT_PATHS
        if protected and request.headers.get("x-api-key") != settings.API_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "API key tidak dikirim atau salah. Isi di halaman Settings."},
            )
    return await call_next(request)


_access_log_writes = 0


@app.middleware("http")
async def access_log(request: Request, call_next):
    """Catat akses API (metode, path, status, IP, waktu) untuk halaman Blue Team.

    Yang dicatat hanya metadata permintaan. Tidak ada body, cookie, header
    otorisasi, maupun isi form — sengaja, karena log yang menyimpan isi request
    mudah berubah jadi tempat kebocoran kredensial.
    """
    response = await call_next(request)
    path = request.url.path
    if (
        settings.ACCESS_LOG_ENABLED
        and path.startswith("/api/")
        and not path.startswith(LOG_SKIP_PREFIXES)
    ):
        global _access_log_writes
        try:
            with SessionLocal() as db:
                db.add(SecurityLog(
                    event_type=f"{request.method} {path} {response.status_code}",
                    client_ip=_client_ip(request),
                    access_time=datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
                ))
                db.commit()
                _access_log_writes += 1
                # Jaga tabel tetap kecil: simpan N baris terbaru saja.
                if _access_log_writes % 25 == 0:
                    cutoff = (
                        db.query(SecurityLog.id)
                        .order_by(SecurityLog.id.desc())
                        .offset(settings.ACCESS_LOG_MAX_ROWS)
                        .first()
                    )
                    if cutoff:
                        db.query(SecurityLog).filter(SecurityLog.id <= cutoff[0]).delete()
                        db.commit()
        except Exception:  # noqa: BLE001 - pencatatan tidak boleh menggagalkan request
            pass
    return response


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

    Diisi oleh middleware access_log: metode, path, status, IP, waktu.
    Tidak ada body request, cookie, header otorisasi, email, maupun password.
    """
    return db.query(SecurityLog).order_by(SecurityLog.id.desc()).limit(50).all()

"""Pengelolaan koneksi database dan session SQLAlchemy."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import get_settings

settings = get_settings()

# connect_args khusus SQLite agar bisa dipakai lintas thread (dibutuhkan FastAPI + TestClient).
_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency FastAPI: satu session per request, selalu ditutup setelah selesai."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

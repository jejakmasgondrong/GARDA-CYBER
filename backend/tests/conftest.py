"""
Fixture pytest: database SQLite TERPISAH khusus untuk pengujian
(garda_cyber_test.db), tidak pernah menyentuh garda_cyber.db milik pengguna.

Setiap tes berjalan di transaksi yang di-rollback otomatis setelah tes selesai,
sehingga tes idempoten — bisa dijalankan berulang kali tanpa data basi yang
menyebabkan collision (mis. dedupe_key 409).
"""
import os

os.environ["DATABASE_URL"] = "sqlite:///./garda_cyber_test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app

TEST_ENGINE = create_engine("sqlite:///./garda_cyber_test.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    # Sengaja TIDAK menghapus file database test di sini supaya hasil bisa diperiksa manual bila perlu.


@pytest.fixture()
def db_session():
    """Setiap tes mendapat session yang di-rollback di akhir, menjamin isolasi."""
    connection = TEST_ENGINE.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

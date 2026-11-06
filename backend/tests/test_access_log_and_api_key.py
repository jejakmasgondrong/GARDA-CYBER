"""Test middleware di main.py: penjagaan API key dan access log.

Dua-duanya middleware level aplikasi, jadi tidak terlihat dari test router.
Suite utama mematikan ACCESS_LOG_ENABLED (lihat conftest) supaya cepat; di sini
middleware-nya dinyalakan lewat monkeypatch pada objek settings.

Catatan: middleware memakai SessionLocal sendiri (bukan dependency get_db),
jadi barisnya dibaca lewat session terpisah, bukan session tes.
"""
import app.main as main_module
from app.db.security_log import SecurityLog
from app.db.session import SessionLocal

# PENTING: beberapa test lain memanggil get_settings.cache_clear(), sehingga
# get_settings() bisa mengembalikan instance BARU. main.py menyimpan instance
# sendiri saat import, jadi monkeypatch harus menyasar main_module.settings —
# kalau tidak, middleware tetap membaca nilai lama dan test-nya bohong.


def test_api_key_kosong_berarti_tanpa_auth(client):
    assert main_module.settings.API_KEY == ""
    assert client.get("/api/v1/assets").status_code == 200


def test_api_key_dipakai_menolak_tanpa_header(client, monkeypatch):
    monkeypatch.setattr(main_module.settings, "API_KEY", "rahasia-uji")
    try:
        tanpa_header = client.get("/api/v1/assets")
        assert tanpa_header.status_code == 401
        assert "API key" in tanpa_header.json()["detail"]

        assert client.get("/api/v1/assets", headers={"X-API-Key": "salah"}).status_code == 401
        assert client.get("/api/v1/assets", headers={"X-API-Key": "rahasia-uji"}).status_code == 200
        # health tetap terbuka supaya pemantau/load balancer tidak ikut terkunci
        assert client.get("/api/v1/health").status_code == 200
    finally:
        monkeypatch.setattr(main_module.settings, "API_KEY", "")


def test_access_log_mencatat_metode_path_dan_status(client, monkeypatch):
    monkeypatch.setattr(main_module.settings, "ACCESS_LOG_ENABLED", True)
    try:
        assert client.get("/api/v1/assets").status_code == 200
    finally:
        monkeypatch.setattr(main_module.settings, "ACCESS_LOG_ENABLED", False)

    with SessionLocal() as check:
        rows = (
            check.query(SecurityLog)
            .filter(SecurityLog.event_type.like("GET /api/v1/assets%"))
            .all()
        )
        assert rows, "access log tidak menulis baris untuk GET /api/v1/assets"
        terakhir = rows[-1]
        assert terakhir.event_type.endswith("200")
        assert terakhir.client_ip
        assert terakhir.access_time
        # bersihkan supaya test DB tidak menumpuk baris
        ids = [r.id for r in rows]
        check.query(SecurityLog).filter(SecurityLog.id.in_(ids)).delete(synchronize_session=False)
        check.commit()

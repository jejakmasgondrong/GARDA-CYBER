"""
Tes endpoint IP Intelligence. Provider DIMOCK total -- tidak ada panggilan
jaringan nyata di sini, sesuai instruksi (tidak memanggil layanan pihak ketiga asli saat tes).
"""
from unittest.mock import patch, MagicMock

from app.integrations.providers.abuseipdb_provider import AbuseIpdbProvider
from app.integrations.providers.demo_provider import DemoIpProvider
from app.models.ip_lookup import ProviderResultStatus


def test_lookup_public_ip_without_configured_provider_returns_not_configured(client, monkeypatch):
    # Paksa kedua provider tidak terkonfigurasi agar tes isolasi dari .env.
    # Mock get_settings di modul provider agar _get_api_key() mengembalikan ""
    from app.services import ip_lookup_service
    from app.core.config import Settings

    empty_settings = Settings(ABUSEIPDB_API_KEY="", DATABASE_URL="sqlite:///./garda_cyber_test.db")

    unconfigured_abuseipdb = AbuseIpdbProvider()
    unconfigured_demo = DemoIpProvider()

    monkeypatch.setattr(ip_lookup_service, "_PROVIDERS", [unconfigured_abuseipdb, unconfigured_demo])

    with patch("app.integrations.providers.abuseipdb_provider.get_settings", return_value=empty_settings):
        res = client.post("/api/v1/ip-intelligence/lookup", json={"ip_address": "8.8.8.8"})

    assert res.status_code == 201
    body = res.json()
    assert body["classification"] == "public"
    assert body["eligible_for_external_lookup"] is True
    # Demo provider nonaktif secara default (DEMO_PROVIDER_ENABLED tidak diset) -> jujur not_configured.
    assert body["provider_status"] == ProviderResultStatus.NOT_CONFIGURED.value


def test_lookup_private_ip_never_calls_provider(client):
    with patch(
        "app.integrations.providers.demo_provider.DemoIpProvider.lookup"
    ) as mocked_lookup:
        res = client.post("/api/v1/ip-intelligence/lookup", json={"ip_address": "192.168.1.1"})
        assert res.status_code == 201
        body = res.json()
        assert body["classification"] == "private"
        assert body["eligible_for_external_lookup"] is False
        # Inti dari scope enforcement: provider TIDAK PERNAH dipanggil untuk IP private.
        mocked_lookup.assert_not_called()


def test_lookup_invalid_ip_returns_422(client):
    res = client.post("/api/v1/ip-intelligence/lookup", json={"ip_address": "tidak-valid"})
    assert res.status_code == 422
    # Pesan error tidak boleh membocorkan stack trace / path internal.
    assert "Traceback" not in res.text
    assert "/home/" not in res.text


def test_lookup_history_is_paginated(client):
    for ip in ["1.1.1.1", "8.8.8.8", "9.9.9.9"]:
        client.post("/api/v1/ip-intelligence/lookup", json={"ip_address": ip})

    res = client.get("/api/v1/ip-intelligence/history?skip=0&limit=2")
    assert res.status_code == 200
    body = res.json()
    assert len(body["items"]) == 2
    assert body["total"] >= 3
    assert body["limit"] == 2

"""
Tes provider AbuseIPDB. Semua HTTP call di-mock total —
TIDAK ADA panggilan jaringan nyata.

Catatan penting: Settings menggunakan pydantic-settings yang membaca .env
secara langsung (bukan via os.environ). Oleh karena itu, untuk tes yang perlu
mensimulasikan 'key tidak ada', kita harus mock get_settings() supaya
mengembalikan Settings instance dengan ABUSEIPDB_API_KEY="".
"""
import json
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.core.config import Settings, get_settings
from app.integrations.providers.abuseipdb_provider import AbuseIpdbProvider
from app.models.ip_lookup import ProviderResultStatus


# ---------------------------------------------------------------------------
#  Fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def provider():
    return AbuseIpdbProvider()


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    """Bersihkan cache get_settings() sebelum dan sesudah setiap tes."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _mock_settings(**overrides) -> Settings:
    """Buat Settings instance dengan default kosong, lalu override sesuai kebutuhan."""
    defaults = {
        "ABUSEIPDB_API_KEY": "",
        "DATABASE_URL": "sqlite:///./garda_cyber_test.db",
    }
    defaults.update(overrides)
    return Settings(**defaults)


def _make_mock_response(status_code: int = 200, json_data: dict | None = None) -> MagicMock:
    """Buat tiruan httpx.Response."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.text = json.dumps(json_data or {})
    return resp


SAMPLE_ABUSEIPDB_RESPONSE = {
    "data": {
        "ipAddress": "8.8.8.8",
        "isPublic": True,
        "ipVersion": 4,
        "isWhitelisted": True,
        "abuseConfidenceScore": 0,
        "countryCode": "US",
        "usageType": "Data Center/Web Hosting/Transit",
        "isp": "Google LLC",
        "domain": "google.com",
        "totalReports": 123,
        "numDistinctUsers": 45,
        "lastReportedAt": "2024-01-15T10:00:00+00:00",
    }
}


# ---------------------------------------------------------------------------
#  Test: tidak terkonfigurasi (API key kosong)
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_not_configured_when_no_api_key(mock_gs, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="")
    result = provider.lookup("8.8.8.8")
    assert result.status == ProviderResultStatus.NOT_CONFIGURED
    assert result.source == "abuseipdb"
    assert result.summary is None


@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_not_configured_when_empty_api_key(mock_gs, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="   ")
    result = provider.lookup("8.8.8.8")
    assert result.status == ProviderResultStatus.NOT_CONFIGURED


@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_is_configured_true_when_key_present(mock_gs, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    assert provider.is_configured() is True


@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_is_configured_false_when_key_absent(mock_gs, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="")
    assert provider.is_configured() is False


# ---------------------------------------------------------------------------
#  Test: sukses (respons 200 normal)
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_successful_lookup(mock_gs, mock_get, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    mock_get.return_value = _make_mock_response(200, SAMPLE_ABUSEIPDB_RESPONSE)

    result = provider.lookup("8.8.8.8")

    assert result.status == ProviderResultStatus.OK
    assert result.source == "abuseipdb"
    assert "AbuseIPDB score: 0/100" in result.summary
    assert "Reports: 123" in result.summary
    assert "Country: US" in result.summary
    assert "Google LLC" in result.summary
    assert "Whitelisted" in result.summary

    # Pastikan httpx.get dipanggil dengan header dan params benar
    mock_get.assert_called_once()
    call_kwargs = mock_get.call_args
    assert call_kwargs.kwargs["headers"]["Key"] == "test-key-12345"
    assert call_kwargs.kwargs["params"]["ipAddress"] == "8.8.8.8"
    # Pastikan API key tidak muncul di summary/result
    assert "test-key-12345" not in result.summary


# ---------------------------------------------------------------------------
#  Test: rate limited (HTTP 429)
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_rate_limited(mock_gs, mock_get, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    mock_get.return_value = _make_mock_response(429, {"errors": [{"detail": "rate limit"}]})

    result = provider.lookup("1.2.3.4")

    assert result.status == ProviderResultStatus.RATE_LIMITED
    assert "rate limit" in result.summary.lower()


# ---------------------------------------------------------------------------
#  Test: timeout
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_timeout(mock_gs, mock_get, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    mock_get.side_effect = httpx.TimeoutException("Connection timed out")

    result = provider.lookup("1.2.3.4")

    assert result.status == ProviderResultStatus.TIMEOUT
    assert "timed out" in result.summary.lower()


# ---------------------------------------------------------------------------
#  Test: provider error (HTTP 500, dsb.)
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_server_error(mock_gs, mock_get, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    mock_get.return_value = _make_mock_response(500, {"errors": [{"detail": "internal"}]})

    result = provider.lookup("1.2.3.4")

    assert result.status == ProviderResultStatus.PROVIDER_ERROR
    assert "500" in result.summary


# ---------------------------------------------------------------------------
#  Test: network error (httpx.HTTPError)
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_network_error(mock_gs, mock_get, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    mock_get.side_effect = httpx.ConnectError("DNS resolution failed")

    result = provider.lookup("1.2.3.4")

    assert result.status == ProviderResultStatus.PROVIDER_ERROR
    assert "ConnectError" in result.summary


# ---------------------------------------------------------------------------
#  Test: JSON parse error
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_json_parse_error(mock_gs, mock_get, provider):
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    resp = _make_mock_response(200)
    resp.json.side_effect = ValueError("Expecting value")
    mock_get.return_value = resp

    result = provider.lookup("1.2.3.4")

    assert result.status == ProviderResultStatus.PROVIDER_ERROR
    assert "parse" in result.summary.lower()


# ---------------------------------------------------------------------------
#  Test integrasi: service memilih AbuseIPDB jika terkonfigurasi
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_service_picks_abuseipdb_over_demo(mock_gs, mock_get, client):
    """Endpoint /lookup menghasilkan provider_id='abuseipdb' saat key tersedia."""
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="test-key-12345")
    mock_get.return_value = _make_mock_response(200, SAMPLE_ABUSEIPDB_RESPONSE)

    res = client.post("/api/v1/ip-intelligence/lookup", json={"ip_address": "8.8.8.8"})
    assert res.status_code == 201
    body = res.json()

    assert body["provider_id"] == "abuseipdb"
    assert body["provider_status"] == "ok"
    assert "AbuseIPDB score" in body["result_summary"]
    # API key TIDAK boleh muncul di response
    assert "test-key-12345" not in json.dumps(body)


@patch("app.integrations.providers.abuseipdb_provider.httpx.get")
@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_service_falls_back_to_demo_when_abuseipdb_not_configured(mock_gs, mock_get, client, monkeypatch):
    """Saat ABUSEIPDB_API_KEY kosong dan DEMO_PROVIDER_ENABLED juga kosong,
    tidak ada provider yang terkonfigurasi. Service akan menggunakan provider
    pertama di list (_PROVIDERS[0]) sebagai fallback — yaitu AbuseIPDB — yang
    mengembalikan NOT_CONFIGURED dari lookup()-nya sendiri."""
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="")
    monkeypatch.delenv("DEMO_PROVIDER_ENABLED", raising=False)

    from app.services import ip_lookup_service
    unconfigured_abuseipdb = AbuseIpdbProvider()

    from app.integrations.providers.demo_provider import DemoIpProvider
    unconfigured_demo = DemoIpProvider()
    monkeypatch.setattr(ip_lookup_service, "_PROVIDERS", [unconfigured_abuseipdb, unconfigured_demo])

    res = client.post("/api/v1/ip-intelligence/lookup", json={"ip_address": "8.8.8.8"})
    assert res.status_code == 201
    body = res.json()

    # Kedua provider tidak terkonfigurasi → fallback ke _PROVIDERS[0] (abuseipdb)
    # yang mengembalikan NOT_CONFIGURED
    assert body["provider_id"] == "abuseipdb"
    assert body["provider_status"] == "not_configured"
    assert body["result_summary"] is None
    # httpx.get TIDAK dipanggil karena is_configured() == False di dalam provider.lookup()
    mock_get.assert_not_called()


# ---------------------------------------------------------------------------
#  Test regresi: settings .env vs os.environ
# ---------------------------------------------------------------------------

@patch("app.integrations.providers.abuseipdb_provider.get_settings")
def test_provider_reads_from_settings_not_os_environ(mock_gs, provider):
    """Regresi untuk bug asli: provider harus membaca API key dari Settings
    (yang membaca .env), bukan langsung dari os.environ."""
    # Settings punya key → provider configured
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="from-settings")
    assert provider.is_configured() is True

    # Settings tidak punya key → provider not configured
    mock_gs.return_value = _mock_settings(ABUSEIPDB_API_KEY="")
    assert provider.is_configured() is False

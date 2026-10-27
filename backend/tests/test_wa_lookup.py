"""Test draft WA number lookup (mock httpx, tanpa key/internet asli).

Dua cara jalan (pola draft yang sama):
- ``pytest tests/test_wa_lookup.py -q`` (di mesin yg punya deps backend)
- ``python tests/test_wa_lookup.py`` (standalone)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx  # noqa: E402

from app.integrations.adapters.wa_lookup_adapter import WaLookupAdapter  # noqa: E402
from app.integrations.providers.wa_number_provider import (  # noqa: E402
    WaNumberProvider,
    is_valid_phone,
    sanitize_phone,
)


def test_phone_validation_mirrors_upstream():
    assert sanitize_phone("+62 812-3456-789") == "628123456789"
    assert is_valid_phone("628123456789")
    assert not is_valid_phone("12345")  # terlalu pendek
    assert not is_valid_phone("abc")


def test_lookup_refuses_without_key():
    res = WaNumberProvider().lookup("628123456789", "about")
    assert res.status.value == "not_configured", res
    assert "WA_OSINT_RAPIDAPI_KEY" in (res.summary or "")


def test_lookup_refuses_bad_endpoint():
    res = WaNumberProvider().lookup("628123456789", "b64")
    assert res.status.value == "provider_error", res
    assert "ditolak" in (res.summary or "")


class _FakeResponse:
    status_code = 200
    text = '{"about": "Hai saya pakai WA"}'

    def json(self):
        return {"about": "Hai saya pakai WA"}


def test_lookup_ok_with_mock(monkeypatch=None):
    real_get, real_post = httpx.get, httpx.post
    real_key = WaNumberProvider.__dict__["_get_api_key"]
    WaNumberProvider._get_api_key = staticmethod(lambda: "DUMMY")
    httpx.get = lambda *a, **k: _FakeResponse()
    try:
        res = WaNumberProvider().lookup("628123456789", "about")
    finally:
        httpx.get, httpx.post = real_get, real_post
        WaNumberProvider._get_api_key = real_key
    assert res.status.value == "ok", res
    assert "Hai saya pakai WA" in (res.summary or ""), res


def test_lookup_rate_limited_with_mock():
    class _R429(_FakeResponse):
        status_code = 429
    real_get = httpx.get
    real_key = WaNumberProvider.__dict__["_get_api_key"]
    WaNumberProvider._get_api_key = staticmethod(lambda: "DUMMY")
    httpx.get = lambda *a, **k: _R429()
    try:
        res = WaNumberProvider().lookup("628123456789", "about")
    finally:
        httpx.get = real_get
        WaNumberProvider._get_api_key = real_key
    assert res.status.value == "rate_limited", res


def test_adapter_requires_case_ref():
    res = WaLookupAdapter().execute("aset-lab", {"phone": "628123456789"})
    assert not res.success and "case_ref" in res.summary


def test_adapter_contract_flags():
    s = WaLookupAdapter().status()
    assert s["tool_id"] == "wa_number_lookup"
    # Tanpa key di mesin draft: configured False secara jujur.
    assert s["configured"] is False
    assert s["executable"] is False


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception as exc:
            failed += 1
            print(f"FAIL {fn.__name__}: {exc.__class__.__name__}: {exc}")
    print(f"{len(tests) - failed}/{len(tests)} passed")
    raise SystemExit(1 if failed else 0)

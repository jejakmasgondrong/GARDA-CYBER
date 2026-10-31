"""Stub crash harus tetap non-fungsional: selalu gagal, tanpa payload."""
from app.integrations.adapters.kartika_crash_stub_adapter import (
    DISABLED_MESSAGE,
    KartikaCrashStubAdapter,
)


def test_stub_selalu_gagal_dan_tanpa_payload():
    adapter = KartikaCrashStubAdapter()
    assert adapter.info.implemented is False
    assert adapter.is_installed() is False
    assert adapter.is_configured() is False
    assert adapter.is_executable() is False

    result = adapter.execute("lab-sendiri", {"message": "x" * 5000})
    assert result.success is False
    assert "dinonaktifkan by design" in result.summary
    assert DISABLED_MESSAGE in result.summary

    # Tidak ada atribut/metode pembuat payload di stub.
    for attr in ("payload", "virtex", "crasher", "send", "flood"):
        assert not hasattr(adapter, attr), attr

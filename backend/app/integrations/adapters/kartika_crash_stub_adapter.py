"""Kartika crash stub -- NON-FUNGSIONAL BY DESIGN (DRAFT, belum untuk PR).

BATAS TEGAS (jangan dilepas diam-diam):
- File ini SENGAJA tidak berisi logika crash apa pun: tanpa pembuatan
  payload, tanpa teks virtex, tanpa pengiriman pesan, tanpa network ke
  WhatsApp, tanpa target.
- TIDAK didaftarkan ke registry (tidak ada import di registry.py), jadi
  tidak muncul sebagai tool dan tidak bisa dieksekusi lewat Job Manager.
- `execute()` selalu menjawab gagal + pesan dinonaktifkan, apa pun
  parameters yang masuk (parameters diabaikan total).
- Pengaktifan oleh panitia BUKAN flip flag: butuh implementasi baru +
  review + keputusan eksplisit + user admin TNI + aset lab sendiri.
  File ini tidak boleh diubah jadi eksekutor dengan edit kecil.

Alasan: kode crash yang fungsional adalah senjatanya sendiri; gate
non-aktif tidak menghapus kemampuan itu. Jadi yang dicatat di sini
hanya jejak non-fungsional.
"""
from __future__ import annotations

from app.integrations.adapters.base import (
    BaseIntegrationAdapter,
    ExecutionResult,
    IntegrationInfo,
)

# JANGAN DAFTARKAN KE registry.py. Baris ini pengingat, bukan instruksi aktif.

DISABLED_MESSAGE = (
    "kartika_crash_stub dinonaktifkan by design: tidak ada fungsi crash "
    "di repo ini. Pengaktifan butuh implementasi baru + review + keputusan "
    "panitia + admin TNI + aset lab sendiri."
)


class KartikaCrashStubAdapter(BaseIntegrationAdapter):
    """Jejak non-fungsional untuk permintaan fungsi crash (selalu gagal)."""

    info = IntegrationInfo(
        tool_id="kartika_crash_stub",
        display_name="Kartika Crash Stub (Disabled)",
        description="Stub non-fungsional: selalu menolak eksekusi. "
                    "Tanpa payload, tanpa network, tanpa target.",
        official_repo="(jejak internal GARDA -- tidak ada repo eksekutor)",
        required_env_vars=[],
        capability_summary="Non-fungsional by design (tidak bisa dieksekusi)",
        implemented=False,
        binary_name=None,
    )

    def is_installed(self) -> bool:
        return False

    def is_configured(self) -> bool:
        return False

    def execute(self, asset_identifier: str, parameters: dict,
                timeout_seconds: int = 60) -> ExecutionResult:
        _ = (asset_identifier, parameters, timeout_seconds)
        return ExecutionResult(False, DISABLED_MESSAGE)

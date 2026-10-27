"""Adapter WA number lookup -- enrichment nomor TERLAPOR (DRAFT, belum PR).

Syarat tiap eksekusi: ``parameters`` wajib berisi ``case_ref`` (label kasus,
mis. "INC-2026-014" atau "laporan-korban-07", min 3 char) dan ``phone``.
Tanpa case_ref job DITOLAK sebelum request keluar -- ini pagar privasinya:
nomor orang hanya boleh diintip dalam konteks kasus, dan jejaknya tercatat
di Job + audit log oleh JobManager.

Scope aset: JobManager tetap mensyaratkan aset ACTIVE; identifier aset
dipakai sebagai label, nomor target datang dari parameters (dipisah supaya
jelas mana aset yang diotorisasi vs nomor yang diselidiki).
"""
from __future__ import annotations

from app.core.config import get_settings
from app.integrations.adapters.base import (
    BaseIntegrationAdapter,
    ExecutionResult,
    IntegrationInfo,
)
from app.integrations.providers.wa_number_provider import (
    ALLOWED_ENDPOINTS,
    WaNumberProvider,
    is_valid_phone,
    sanitize_phone,
)


class WaLookupAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="wa_number_lookup",
        display_name="WA Number Lookup",
        description="Enrichment nomor terlapor via RapidAPI (status/bisnis/"
                    "perangkat/privasi). Wajib case_ref. Tanpa foto, tanpa dump.",
        official_repo="https://github.com/kinghacker0/WhatsApp-OSINT (kontrak saja)",
        required_env_vars=["WA_OSINT_RAPIDAPI_KEY"],
        capability_summary="Enrichment nomor kasus penipuan (berbayar, opsional)",
        binary_name=None,
    )

    def is_installed(self) -> bool:
        return True  # httpx sudah dependensi backend

    def is_configured(self) -> bool:
        settings = get_settings()
        return bool(settings.WA_OSINT_ENABLED and WaNumberProvider().is_configured())

    def execute(self, asset_identifier: str, parameters: dict,
                timeout_seconds: int = 60) -> ExecutionResult:
        settings = get_settings()
        if not settings.WA_OSINT_ENABLED:
            return ExecutionResult(False, "WA lookup dinonaktifkan (WA_OSINT_ENABLED=false).")
        params = parameters or {}
        case_ref = str(params.get("case_ref", "") or "").strip()
        if len(case_ref) < 3:
            return ExecutionResult(
                False,
                "Parameter 'case_ref' wajib (min 3 char, mis. INC-2026-014) -- "
                "lookup tanpa konteks kasus ditolak.",
            )
        phone = sanitize_phone(str(params.get("phone", "") or ""))
        if not is_valid_phone(phone):
            return ExecutionResult(False, "Parameter 'phone' wajib 8..15 digit (kode negara tanpa +).")
        endpoint = str(params.get("endpoint", "about") or "about").lower()
        if endpoint not in ALLOWED_ENDPOINTS:
            return ExecutionResult(
                False,
                f"Endpoint '{endpoint}' ditolak (hanya: {', '.join(ALLOWED_ENDPOINTS)}). "
                "Foto profil dan full dump sengaja tidak dibuka.",
            )
        provider = WaNumberProvider()
        if not provider.is_configured():
            return ExecutionResult(
                False,
                "WA_OSINT_RAPIDAPI_KEY kosong -- modul jujur nonaktif sampai key diisi.",
            )
        try:
            result = provider.lookup(phone, endpoint,
                                     timeout_seconds=min(float(timeout_seconds), 30.0))
        except Exception as exc:  # kontrak: tidak boleh bocor jadi 500
            return ExecutionResult(False, f"WA lookup gagal: {exc.__class__.__name__}")
        label = (asset_identifier or "").strip() or "(tanpa label aset)"
        ok = result.status.value == "ok"
        head = (f"wa_number_lookup/{endpoint} [{case_ref}] {label}: "
                f"{result.status.value} -- {result.summary}")
        tail = ("Sumber: RapidAPI berbayar (kuota di sana). "
                "Gunakan hanya untuk nomor terlapor dalam kasus.")
        return ExecutionResult(ok, f"{head}\n{tail}" if ok else head)

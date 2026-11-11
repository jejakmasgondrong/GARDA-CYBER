import json

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.integrations.adapters.base import BaseIntegrationAdapter, ExecutionResult, IntegrationInfo
from app.services.ip_lookup_service import IpLookupService, InvalidIpAddressError

# Kalimat keterangan mode demo (permintaan Gondrong, 2026-11-11) -- wajib muncul
# persis di output job ketika provider demo yang menjawab.
_DEMO_NOTE = (
    "karena keterbatasan waktu dan sumber daya, maka fungsi tidak sampai "
    "berjalan karena butuh api berbayar"
)


class IpReputationAdapter(BaseIntegrationAdapter):
    """Entri registry untuk provider IP Intelligence (lihat
    app/integrations/providers/ untuk implementasi provider).
    """

    info = IntegrationInfo(
        tool_id="ip_reputation",
        display_name="IP Reputation Provider",
        description="Lookup klasifikasi & reputasi IP publik via AbuseIPDB API v2. Fallback ke provider demo jika API key tidak diset.",
        official_repo="https://www.abuseipdb.com/",
        required_env_vars=["ABUSEIPDB_API_KEY"],
        capability_summary="IP classification (selalu aktif) + reputasi eksternal (AbuseIPDB / demo fallback)",
        implemented=True,
    )

    def is_configured(self) -> bool:
        # Demo-aware: AbuseIPDB key kosong masih dianggap terkonfigurasi BILA
        # DEMO_PROVIDER_ENABLED=true, supaya execute() bisa jalan dengan provider
        # demo (berlabel data demo, bukan reputasi nyata).
        if get_settings().ABUSEIPDB_API_KEY.strip():
            return True
        return get_settings().DEMO_PROVIDER_ENABLED

    def execute(self, asset_identifier: str, parameters: dict, timeout_seconds: int = 60) -> ExecutionResult:
        """Lookup reputasi IP via IpLookupService (provider chain nyata).

        Session dibuat sendiri karena JobManager memanggil execute() tanpa
        db session. Validasi & klasifikasi IP tetap jalan; IP non-publik
        tidak pernah diteruskan ke provider eksternal.
        """
        db = SessionLocal()
        try:
            record = IpLookupService(db).lookup(asset_identifier, requested_by="job_manager")
        except InvalidIpAddressError as exc:
            return ExecutionResult(success=False, summary=str(exc))
        except Exception as exc:  # provider TIDAK BOLEH membuat job endpoint 500
            return ExecutionResult(success=False, summary=f"Lookup gagal: {exc.__class__.__name__}")
        finally:
            db.close()

        excerpt = json.dumps(
            {
                "ip": record.ip_address,
                "classification": record.classification.value,
                "provider_id": record.provider_id,
                "provider_status": record.provider_status.value,
                "result_summary": record.result_summary,
            },
            ensure_ascii=False,
        )

        if record.provider_id is None:
            # Klasifikasi selesai, tapi IP tidak layak lookup eksternal.
            return ExecutionResult(
                success=True,
                summary=(
                    f"Klasifikasi: {record.classification.value}. "
                    "IP non-publik tidak pernah diteruskan ke provider eksternal."
                ),
                raw_output_excerpt=excerpt,
            )

        summary = (
            f"Klasifikasi: {record.classification.value}. "
            f"Provider: {record.provider_id}. Status: {record.provider_status.value}. "
            f"{record.result_summary or ''}"
        ).strip()
        if record.provider_id == "demo":
            summary += f" ({_DEMO_NOTE})"

        return ExecutionResult(
            success=record.provider_status.value == "ok",
            summary=summary,
            raw_output_excerpt=excerpt,
        )

    def status(self) -> dict:
        base = super().status()
        demo_active = self.is_configured() and not bool(
            get_settings().ABUSEIPDB_API_KEY.strip()
        )
        if demo_active:
            # Field opsional di luar kontrak status() base -- dipakai frontend
            # untuk melabel mode demo secara jujur.
            base["demo_mode"] = True
        return base

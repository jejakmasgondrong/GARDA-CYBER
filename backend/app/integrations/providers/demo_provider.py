"""
Provider CONTOH untuk demonstrasi arsitektur — BUKAN provider threat-intel sungguhan.
Tidak pernah melakukan HTTP request nyata. Selalu mengembalikan status
`not_configured` kecuali secara eksplisit diaktifkan lewat DEMO_PROVIDER_ENABLED=true,
dan hasilnya SELALU diberi label jelas sebagai data demo.

Provider sungguhan (mis. layanan reputasi IP berbayar/gratis) ditambahkan
dengan mengimplementasikan IpReputationProvider yang sama, berisi HTTP call
nyata + timeout + penanganan error -- bukan mengubah file ini.
"""
import os
from datetime import datetime, timezone

from app.integrations.providers.base import IpReputationProvider, ProviderResult
from app.models.ip_lookup import ProviderResultStatus


class DemoIpProvider(IpReputationProvider):
    provider_id = "demo"
    display_name = "Demo Provider (contoh arsitektur, bukan data nyata)"
    required_env_vars = ["DEMO_PROVIDER_ENABLED"]

    def is_configured(self) -> bool:
        return os.getenv("DEMO_PROVIDER_ENABLED", "").lower() == "true"

    def lookup(self, ip_address: str, timeout_seconds: float = 5.0) -> ProviderResult:
        if not self.is_configured():
            return ProviderResult(
                status=ProviderResultStatus.NOT_CONFIGURED,
                summary=None,
                source=self.provider_id,
                collected_at_iso=datetime.now(timezone.utc).isoformat(),
            )
        return ProviderResult(
            status=ProviderResultStatus.OK,
            summary=f"[DATA DEMO -- bukan reputasi nyata] {ip_address} diperiksa oleh provider contoh.",
            source=self.provider_id,
            collected_at_iso=datetime.now(timezone.utc).isoformat(),
        )

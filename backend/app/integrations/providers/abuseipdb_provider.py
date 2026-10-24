"""
Provider AbuseIPDB API v2 untuk IP Intelligence.

Memanggil endpoint https://api.abuseipdb.com/api/v2/check untuk mendapatkan
skor reputasi IP.  API key dibaca dari environment variable ABUSEIPDB_API_KEY
(diisi via backend/.env).

Tidak pernah mencetak/men-log API key.
"""
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.integrations.providers.base import IpReputationProvider, ProviderResult
from app.models.ip_lookup import ProviderResultStatus

_ABUSEIPDB_CHECK_URL = "https://api.abuseipdb.com/api/v2/check"


class AbuseIpdbProvider(IpReputationProvider):
    provider_id = "abuseipdb"
    display_name = "AbuseIPDB (v2)"
    required_env_vars = ["ABUSEIPDB_API_KEY"]

    # -- internal helpers (bukan bagian dari ABC) --------------------------------

    @staticmethod
    def _get_api_key() -> str:
        return get_settings().ABUSEIPDB_API_KEY.strip()

    def is_configured(self) -> bool:
        return bool(self._get_api_key())

    # -- lookup utama ------------------------------------------------------------

    def lookup(self, ip_address: str, timeout_seconds: float = 5.0) -> ProviderResult:
        now_iso = datetime.now(timezone.utc).isoformat()

        api_key = self._get_api_key()
        if not api_key:
            return ProviderResult(
                status=ProviderResultStatus.NOT_CONFIGURED,
                summary=None,
                source=self.provider_id,
                collected_at_iso=now_iso,
            )

        headers = {
            "Key": api_key,
            "Accept": "application/json",
        }
        params = {
            "ipAddress": ip_address,
            "maxAgeInDays": "90",
        }

        try:
            response = httpx.get(
                _ABUSEIPDB_CHECK_URL,
                headers=headers,
                params=params,
                timeout=timeout_seconds,
            )
        except httpx.TimeoutException:
            return ProviderResult(
                status=ProviderResultStatus.TIMEOUT,
                summary=f"AbuseIPDB request timed out after {timeout_seconds}s",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        except httpx.HTTPError as exc:
            return ProviderResult(
                status=ProviderResultStatus.PROVIDER_ERROR,
                summary=f"HTTP error: {exc.__class__.__name__}",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )

        if response.status_code == 429:
            return ProviderResult(
                status=ProviderResultStatus.RATE_LIMITED,
                summary="AbuseIPDB rate limit exceeded",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )

        if response.status_code != 200:
            return ProviderResult(
                status=ProviderResultStatus.PROVIDER_ERROR,
                summary=f"AbuseIPDB returned HTTP {response.status_code}",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )

        try:
            data = response.json().get("data", {})
        except Exception:
            return ProviderResult(
                status=ProviderResultStatus.PROVIDER_ERROR,
                summary="Failed to parse AbuseIPDB JSON response",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )

        abuse_score = data.get("abuseConfidenceScore", "?")
        total_reports = data.get("totalReports", 0)
        country = data.get("countryCode", "??")
        isp = data.get("isp", "unknown")
        usage_type = data.get("usageType", "unknown")
        is_whitelisted = data.get("isWhitelisted", False)

        summary = (
            f"AbuseIPDB score: {abuse_score}/100 | "
            f"Reports: {total_reports} (90d) | "
            f"Country: {country} | ISP: {isp} | "
            f"Usage: {usage_type}"
        )
        if is_whitelisted:
            summary += " | Whitelisted"

        return ProviderResult(
            status=ProviderResultStatus.OK,
            summary=summary,
            source=self.provider_id,
            collected_at_iso=now_iso,
        )

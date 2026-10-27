"""Provider WhatsApp number lookup via RapidAPI (DRAFT, belum untuk PR).

Kontrak HTTP-nya dipelajari dari repo pihak ketiga
``kinghacker0/WhatsApp-OSINT`` (MIT, 1.3k stars, CLI interaktif) yang dibaca
di ``repos/WhatsApp-OSINT`` -- yang dipakai HANYA kontraknya (host, 6 endpoint,
header, validasi nomor), BUKAN kodenya. Ditulis ulang mengikuti pola
``AbuseIpdbProvider`` (httpx, timeout wajib, tanpa exception bocor).

Batas tegas (alasan tertulis, bukan dipangkas diam-diam):
- Endpoint FOTO (``/wspic/b64``) dan FULL DUMP (``/wspic/dck``) SENGAJA tidak
  diekspos: foto profil adalah data pribadi pihak ketiga (blob base64 tidak
  boleh masuk DB/log), dan full dump tidak punya skema stabil. Hanya
  ``about`` (status), ``bizos`` (verifikasi bisnis), ``devices`` (perangkat),
  ``privacy`` (visibilitas) yang dibuka.
- WAJIB ``case_ref`` (label kasus, mis. ID insiden/laporan korban) di tiap
  lookup -- nomor orang tidak boleh diintip tanpa konteks kasus. Jejak audit
  mengalir lewat Job + audit log GARDA yang sudah ada.
- API key tidak pernah masuk output/log (pola audit_service yang sudah ada).
- Tanpa key (``WA_OSINT_RAPIDAPI_KEY`` kosong) provider jujur menjawab
  NOT_CONFIGURED -- modul mati rapi, bukan error 500.

Ketergantungan jujur: API berbayar pihak ketiga (RapidAPI, kuota/plan
ditentukan di sana), sumbernya scraping sehingga bisa mati/berubah kapan
saja. Modul ini enrichment OPSIONAL, bukan core.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.integrations.providers.base import ProviderResult
from app.models.ip_lookup import ProviderResultStatus

_API_HOST = "whatsapp-osint.p.rapidapi.com"
_API_BASE = f"https://{_API_HOST}"

# Endpoint yang BOLEH dipakai adapter. Foto + full dump dikecualikan (lihat atas).
ALLOWED_ENDPOINTS: dict[str, dict[str, str]] = {
    "about": {"path": "/about", "method": "GET", "label": "Status pengguna"},
    "business": {"path": "/bizos", "method": "POST", "label": "Verifikasi bisnis"},
    "devices": {"path": "/devices", "method": "GET", "label": "Perangkat tertaut"},
    "privacy": {"path": "/privacy", "method": "GET", "label": "Visibilitas privasi"},
}

_PHONE_RE = re.compile(r"^\d{8,15}$")


def sanitize_phone(raw: str) -> str:
    """Buang semua non-digit (spasi, +, strip, kurung)."""
    return re.sub(r"[^\d]", "", raw or "")


def is_valid_phone(phone: str) -> bool:
    return bool(_PHONE_RE.match(phone))


class WaNumberProvider:
    provider_id = "wa_number_lookup"
    display_name = "WhatsApp Number Lookup (RapidAPI)"
    required_env_vars = ["WA_OSINT_RAPIDAPI_KEY"]

    @staticmethod
    def _get_api_key() -> str:
        return get_settings().WA_OSINT_RAPIDAPI_KEY.strip()

    def is_configured(self) -> bool:
        return bool(self._get_api_key())

    def lookup(self, phone: str, endpoint: str = "about",
               timeout_seconds: float = 10.0) -> ProviderResult:
        now_iso = datetime.now(timezone.utc).isoformat()
        number = sanitize_phone(phone)
        if not is_valid_phone(number):
            return ProviderResult(
                status=ProviderResultStatus.PROVIDER_ERROR,
                summary=f"Nomor tidak valid (butuh 8..15 digit, dapat {len(number)}).",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        spec = ALLOWED_ENDPOINTS.get(endpoint)
        if spec is None:
            return ProviderResult(
                status=ProviderResultStatus.PROVIDER_ERROR,
                summary=f"Endpoint '{endpoint}' ditolak (hanya: {', '.join(ALLOWED_ENDPOINTS)}).",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        api_key = self._get_api_key()
        if not api_key:
            return ProviderResult(
                status=ProviderResultStatus.NOT_CONFIGURED,
                summary="WA_OSINT_RAPIDAPI_KEY kosong -- isi di .env dulu.",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        headers = {"x-rapidapi-key": api_key, "x-rapidapi-host": _API_HOST}
        url = _API_BASE + spec["path"]
        try:
            if spec["method"] == "POST":
                response = httpx.post(url, headers=headers,
                                      json={"phone": number}, timeout=timeout_seconds)
            else:
                response = httpx.get(url, headers=headers,
                                     params={"phone": number}, timeout=timeout_seconds)
        except httpx.TimeoutException:
            return ProviderResult(
                status=ProviderResultStatus.TIMEOUT,
                summary=f"WA lookup timeout setelah {timeout_seconds}s",
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
                summary="Kuota RapidAPI habis (429) -- cek plan di RapidAPI.",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        if response.status_code in (401, 403):
            return ProviderResult(
                status=ProviderResultStatus.NOT_CONFIGURED,
                summary=f"API key ditolak (HTTP {response.status_code}) -- cek key/plan.",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        if response.status_code != 200:
            return ProviderResult(
                status=ProviderResultStatus.PROVIDER_ERROR,
                summary=f"Provider balas HTTP {response.status_code}",
                source=self.provider_id,
                collected_at_iso=now_iso,
            )
        try:
            data = response.json()
        except Exception:
            text = (response.text or "").strip()
            if "no profile picture" in text.lower() or not text:
                summary = "Tidak ada info (kemungkinan tanpa foto/profil tersembunyi)."
            else:
                summary = f"Respons non-JSON ({len(text)} char) -- lihat manual."
            return ProviderResult(status=ProviderResultStatus.OK, summary=summary,
                                  source=self.provider_id, collected_at_iso=now_iso)
        return ProviderResult(
            status=ProviderResultStatus.OK,
            summary=summarize(number, endpoint, data),
            source=self.provider_id,
            collected_at_iso=now_iso,
        )


def _clip(value, limit: int = 120) -> str:
    text = str(value if value is not None else "-")
    return text if len(text) <= limit else text[:limit] + "..."


def summarize(number: str, endpoint: str, data) -> str:
    """Ringkas JSON provider jadi 1-3 baris metadata. Tanpa foto, tanpa dump."""
    if not isinstance(data, dict):
        return f"{number}: respons di luar skema ({type(data).__name__}) -- tinjau manual."
    if endpoint == "about":
        about = data.get("about", data.get("status", "-")) or "-"
        extra = []
        if "last_seen" in data:
            extra.append(f"last_seen={data['last_seen']}")
        if "is_online" in data:
            extra.append("online" if data["is_online"] else "offline")
        tail = (" | " + " ".join(extra)) if extra else ""
        return f"{number}: status={_clip(about)}{tail}"
    if endpoint == "business":
        items = data if isinstance(data, list) else [data]
        first = items[0] if items and isinstance(items[0], dict) else {}
        return (f"{number}: isBusiness={first.get('isBusiness', '?')} | "
                f"verifiedName={_clip(first.get('verifiedName', '-'))}")
    if endpoint == "devices":
        devices = data.get("devices", [])
        count = len(devices) if isinstance(devices, list) else devices
        return f"{number}: perangkat tertaut={count}"
    if endpoint == "privacy":
        keys = ("privacy", "profile_visibility", "last_seen", "read_receipts",
                "status_visibility", "profile_picture")
        shown = " | ".join(f"{k}={data[k]}" for k in keys if k in data) or "tanpa field dikenal"
        return f"{number}: {shown}"
    return f"{number}: endpoint {endpoint} OK (ringkasan belum didefinisikan)."

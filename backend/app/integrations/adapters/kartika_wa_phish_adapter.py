"""Kartika WA Phish -- analisis pesan WhatsApp tempelan (DRAFT, belum untuk PR).

BATAS TEGAS (ditulis di sini supaya tidak melebar diam-diam):
- Adapter ini TIDAK menyentuh WhatsApp sama sekali: tanpa API, tanpa scraping
  profil, tanpa query nomor, tanpa network. Inputnya hanya TEKS yang ditempel
  user lewat parameters (mis. dari ekspor chat korban yang melapor).
- Alasannya: query otomatis ke akun WhatsApp melanggar ToS WhatsApp dan
  menyentuh privasi pihak ketiga; analisis teks tempelan tidak.
- Keluaran = skor + ATURAN yang kena (transparan) + saran, cocok untuk Tema 1
  ide hackathon (deteksi phishing WhatsApp/SMS) sebagai slice pertama.

Aturan (bobot): shortener +3, OTP/rahasia +4, urgensi +2, transfer/rekening +2,
impersonasi institusi +1, tautan generik +1. Ambang: 0-2 RENDAH, 3-5 WASPADA,
>=6 TINGGI. Bobot/ambang ini heuristik awal -- wajib dikalibrasi dari sampel
laporan korban sebelum dipakai operasional (ditulis juga di laporan).
"""
from __future__ import annotations

import re

from app.core.config import get_settings
from app.integrations.adapters.base import (
    BaseIntegrationAdapter,
    ExecutionResult,
    IntegrationInfo,
)

MAX_MESSAGE_CHARS = 4000
MIN_MESSAGE_CHARS = 10

SHORTENERS = (
    "bit.ly", "tinyurl", "goo.gl", "s.id", "cutt.ly", "is.gd", "t.co",
    "tiny.cc", "ow.ly", "shorturl", "lnk.", "rebrand.ly",
)

# (nama_aturan, pola_regex, bobot)
RULES: tuple[tuple[str, str, int], ...] = (
    ("SHORT_URL", r"(?:bit\.ly|tinyurl|goo\.gl|\bs\.id\b|cutt\.ly|is\.gd|\bt\.co\b|tiny\.cc|ow\.ly|shorturl|lnk\.|rebrand\.ly)/\S+", 3),
    ("OTP_SECRET", r"(otp|kode\s+(otp|verifikasi|rahasia)|jangan\s+(beritahu|beritahukan|kasih\s*tahu|bagikan|sebar).*kode|kode.*jangan\s+disebar|minta\s+kode)", 4),
    ("URGENCY", r"(segera|secepatnya|hari\s+ini\s+terakhir|sebelum\s+diblokir|akun.*(blokir|beku|suspend)|verifikasi\s+sekarang|klaim\s+sekarang|kesempatan\s+terakhir|penting\s+segera)", 2),
    ("PRIZE_LURE", r"(selamat.*(menang|pemenang)|hadiah\s+(utama|langsung)|undian\s+(berhadiah|gratis)|klaim\s+hadiah|giveaway.*menang)", 2),
    ("TRANSFER_REQ", r"(transfer\s+ke|kirim\s+(ke|dana\s+ke)|nomor\s+rekening\s*\d|rekening\s*\d{8,}|e[-\s]?wallet|top\s*up.*kirim|bayar\s+admin|biaya\s+(admin|verifikasi|pencairan))", 2),
    ("IMPERSONATION", r"(\bbank\b|polisi|paket\s+(anda|tertahan|ditahan)|kurir|ekspedisi|bea\s*cukai|pajak|call\s*center|\bcs\b|admin\s+grup|pihak\s+(bank|kepolisian|-resmi))", 1),
    ("GENERIC_LINK", r"https?://\S+", 1),
)

_COMPILED = [(name, re.compile(pattern, re.IGNORECASE), weight)
             for name, pattern, weight in RULES]


def analyze_message(text: str) -> tuple[int, list[str]]:
    """Return (skor, [nama_aturan_yang_kena]). Satu hit per aturan (tanpa spam)."""
    hits: list[str] = []
    score = 0
    for name, rx, weight in _COMPILED:
        if rx.search(text):
            hits.append(f"{name}(+{weight})")
            score += weight
    return score, hits


def band(score: int) -> str:
    if score >= 6:
        return "TINGGI"
    if score >= 3:
        return "WASPADA"
    return "RENDAH"


class KartikaWaPhishAdapter(BaseIntegrationAdapter):
    """Skor phishing untuk teks pesan WhatsApp yang ditempel user (offline)."""

    info = IntegrationInfo(
        tool_id="kartika_wa_phish",
        display_name="Kartika WA Phish Analyzer",
        description="Analisis TEKS tempelan (tanpa network/WhatsApp API): skor + "
                    "aturan transparan + saran. Untuk triase laporan korban.",
        official_repo="(baru untuk GARDA -- pola Tema 1 ide hackathon Kartika)",
        required_env_vars=["KARTIKA_WA_PHISH_ENABLED"],
        capability_summary="Triase phishing chat (offline, heuristik awal)",
        binary_name=None,
    )

    def is_installed(self) -> bool:
        return True  # regex stdlib, tanpa dependensi

    def is_configured(self) -> bool:
        return bool(get_settings().KARTIKA_WA_PHISH_ENABLED)

    def execute(self, asset_identifier: str, parameters: dict,
                timeout_seconds: int = 60) -> ExecutionResult:
        settings = get_settings()
        if not settings.KARTIKA_WA_PHISH_ENABLED:
            return ExecutionResult(False, "WA Phish dinonaktifkan (KARTIKA_WA_PHISH_ENABLED=false).")
        params = parameters or {}
        text = str(params.get("message", "") or "")
        if not (MIN_MESSAGE_CHARS <= len(text) <= MAX_MESSAGE_CHARS):
            return ExecutionResult(
                False,
                f"Parameter 'message' wajib {MIN_MESSAGE_CHARS}..{MAX_MESSAGE_CHARS} char "
                f"(dapat {len(text)}). Tempel teks chat yang dilaporkan.",
            )
        score, hits = analyze_message(text)
        level = band(score)
        case = (asset_identifier or "").strip() or "(tanpa label kasus)"
        lines = [
            f"kartika_wa_phish [{case}]: skor {score} -> {level}.",
            "Aturan kena: " + (", ".join(hits) if hits else "- (tidak ada)"),
            "Saran: jangan klik tautan; verifikasi via kanal resmi (aplikasi/call "
            "center resmi); jangan pernah bagikan kode OTP; konfirmasi nomor "
            "rekening lewat sumber kedua.",
            "Catatan: bobot heuristik awal, belum dikalibrasi dari sampel laporan.",
        ]
        return ExecutionResult(True, "\n".join(lines))

"""Kartika SQLi probe -- uji pantulan error input (DRAFT, belum untuk PR).

Filosofi sama seperti probe simulator offensive-lab v8: mengirim marker jinak
ke aset SENDIRI yang terdaftar, lalu membaca RESPONSENYA saja. Tidak ada
ekstraksi data (tanpa UNION/SELECT), tanpa stacked query, tanpa auth bypass,
tanpa time-delay attack. Hasilnya selalu "butuh tinjauan manual", bukan vonis.

Cara kerja (tetap 3 request, GET saja):
1. baseline : ?<param>=KartikaBaseline1
2. quote1   : ?<param>=KartikaBaseline1'
3. quote2   : ?<param>=KartikaBaseline1"

Verdict:
- SINYAL_KUAT : signature error DB muncul di probe quote tapi TIDAK di baseline.
- PERLU_TINJAU: status/panjang respons berubah tanpa signature jelas.
- TANPA_SINYAL: tidak ada perbedaan.

Guard sama seperti kartika_load (resolve_guard dipakai ulang): identifier
harus domain/URL valid milik aset ACTIVE, IP metadata/unspecified/multicast/
reserved ditolak. Private/loopback diizinkan (lab sendiri umumnya privat).
"""
from __future__ import annotations

import time
import urllib.error
import urllib.parse
import urllib.request

from app.core.config import get_settings
from app.integrations.adapters.base import (
    BaseIntegrationAdapter,
    ExecutionResult,
    IntegrationInfo,
)
from app.integrations.adapters.kartika_load_adapter import (
    netloc,
    resolve_guard,
    split_target,
)

BASELINE = "KartikaBaseline1"
REQUEST_TIMEOUT = 5.0
MAX_BODY = 200_000

# Signature error DB umum (lowercase, substring match). Daftar ini untuk
# DETEKSI pantulan, bukan untuk eksploitasi -- tidak ada payload di sini.
DB_ERROR_SIGNATURES = (
    "you have an error in your sql syntax",
    "mysql_fetch",
    "mysqli",
    "pg_query",
    "unterminated quoted string",
    "postgresql",
    "odbc",
    "microsoft ole db",
    "sql server",
    "sqlite3",
    "ora-",
    "pl/sql",
)


def find_db_signatures(body: str) -> list[str]:
    """Kembalikan signature yang muncul di body (case-insensitive)."""
    lowered = (body or "").lower()
    return [sig for sig in DB_ERROR_SIGNATURES if sig in lowered]


def fetch_probe(url: str) -> tuple[int | None, str]:
    """Satu request probe. Return (status|None, body snippet)."""
    req = urllib.request.Request(url, method="GET",
                                 headers={"User-Agent": "GARDA-KartikaProbe/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            raw = resp.read(MAX_BODY)
            return resp.status, raw.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        try:
            raw = exc.read(MAX_BODY)
        except Exception:
            raw = b""
        return exc.code, raw.decode("utf-8", errors="replace")
    except Exception as exc:
        return None, f"TRANSPORT:{exc.__class__.__name__}"


def verdict(baseline: tuple, quote1: tuple, quote2: tuple) -> tuple[str, list[str], list[str]]:
    """Tentukan verdict dari 3 hasil (status, body)."""
    (b_code, b_body), (q1_code, q1_body), (q2_code, q2_body) = baseline, quote1, quote2
    if b_code is None:
        return ("GAGAL_JALAN",
                [f"Baseline tidak terjangkau ({b_body}). Periksa aset dulu."],
                ["Pastikan aset aktif dan path benar sebelum menilai."])
    base_sig = find_db_signatures(b_body)
    sig1 = [s for s in find_db_signatures(q1_body) if s not in base_sig]
    sig2 = [s for s in find_db_signatures(q2_body) if s not in base_sig]
    new_sig = sorted(set(sig1) | set(sig2))
    if new_sig:
        return ("SINYAL_KUAT",
                [f"Signature error DB muncul di probe quote: {', '.join(new_sig)}."],
                ["Tinjau query di endpoint ini; pakai parameterized query/ORM binding;",
                 "jangan tampilkan error DB mentah ke klien (custom error page)."])
    deltas = []
    if q1_code != b_code or q2_code != b_code:
        deltas.append(f"status berubah (baseline {b_code} vs quote {q1_code}/{q2_code})")
    if abs(len(q1_body) - len(b_body)) > max(50, len(b_body) // 4):
        deltas.append("panjang respons berubah signifikan pada probe quote")
    if deltas:
        return ("PERLU_TINJAU",
                ["Perilaku berubah tanpa signature jelas: " + "; ".join(deltas) + "."],
                ["Uji manual dengan akun uji di lab; audit query dan input validation."])
    return ("TANPA_SINYAL",
            ["Baseline dan kedua probe quote merespons identik, tanpa signature error DB."],
            ["Tetap lakukan code review query; probe 3-request bukan bukti aman penuh."])


class KartikaSqliProbeAdapter(BaseIntegrationAdapter):
    """Probe pantulan error SQLi untuk aset terdaftar dan aktif (GET, 3 request)."""

    info = IntegrationInfo(
        tool_id="kartika_sqli_probe",
        display_name="Kartika SQLi Probe",
        description="Kirim 3 marker jinak (baseline + 2 quote) ke satu endpoint aset "
                    "dan baca pantulan error DB. Tanpa ekstraksi data.",
        official_repo="(port dari probe simulator offensive-lab Kartika -- stdlib)",
        required_env_vars=["KARTIKA_SQLI_PROBE_ENABLED"],
        capability_summary="Deteksi dini pantulan error SQL (bukan eksploitasi)",
        binary_name=None,
    )

    def is_installed(self) -> bool:
        return True  # stdlib-only

    def is_configured(self) -> bool:
        return bool(get_settings().KARTIKA_SQLI_PROBE_ENABLED)

    def execute(self, asset_identifier: str, parameters: dict,
                timeout_seconds: int = 60) -> ExecutionResult:
        settings = get_settings()
        if not settings.KARTIKA_SQLI_PROBE_ENABLED:
            return ExecutionResult(False, "SQLi Probe dinonaktifkan (KARTIKA_SQLI_PROBE_ENABLED=false).")
        raw = (asset_identifier or "").strip()
        scheme = "https" if raw.startswith("https://") else "http"
        split = split_target(asset_identifier)
        if split is None:
            return ExecutionResult(False, f"Identifier '{asset_identifier}' bukan target valid.")
        host, port, base_path = split

        params = parameters or {}
        path = str(params.get("path", base_path or "/") or "/").strip() or "/"
        param = str(params.get("param", "id") or "id").strip()
        if not path.startswith("/") or ".." in path or any(ch.isspace() for ch in path):
            return ExecutionResult(False, "Parameter 'path' ditolak (absolut, tanpa spasi/..).")
        if not param.replace("_", "").isalnum() or len(param) > 64:
            return ExecutionResult(False, "Parameter 'param' ditolak (alnumaksimal 64 char).")

        _, refusal = resolve_guard(host)
        if refusal:
            return ExecutionResult(False, refusal)

        def build(value: str) -> str:
            query = urllib.parse.urlencode({param: value})
            return f"{scheme}://{netloc(host, port)}{path}?{query}"

        try:
            base = fetch_probe(build(BASELINE))
            time.sleep(0.5)
            quote1 = fetch_probe(build(BASELINE + "'"))
            time.sleep(0.5)
            quote2 = fetch_probe(build(BASELINE + '"'))
        except Exception as exc:  # kontrak: tidak boleh bocor jadi 500
            return ExecutionResult(False, f"Probe gagal jalan: {exc.__class__.__name__}")

        label, findings, advice = verdict(base, quote1, quote2)
        lines = [
            f"kartika_sqli_probe: {scheme}://{netloc(host, port)}{path}?{param}=... -> {label} "
            f"(baseline {base[0]}, quote1 {quote1[0]}, quote2 {quote2[0]}).",
            "Temuan: " + " | ".join(findings),
            "Rekomendasi: " + " | ".join(advice),
        ]
        return ExecutionResult(True, "\n".join(lines))

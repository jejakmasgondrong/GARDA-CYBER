"""Kartika SQLi probe -- uji pantulan error input (DRAFT, belum untuk PR).

Filosofi sama seperti probe simulator offensive-lab v8: mengirim marker jinak
ke aset SENDIRI yang terdaftar, lalu membaca RESPONSENYA saja.

Senjata ringan (opsional, berpagar): bila ``prove=true`` DAN verdict per
parameter sudah SINYAL_KUAT, adapter mencoba SATU proof eksekusi -- UNION
SELECT atas marker KONSTANTA hardcoded (``KartikaProof``, 1..3 kolom), tanpa
nama tabel/kolom, tanpa enumerasi, tanpa baca satu baris data. Marker yang
terpantul = eksekusi SQL TERBUKTI. User tidak bisa menyelipkan SQL sendiri;
tanpa kedua pagar itu proof tidak pernah dikirim. Tetap hanya untuk aset
terdaftar-ACTIVE milik sendiri dengan jejak audit JobManager.

Cara kerja (5 request per parameter, GET saja):
1. baseline : ?<param>=KartikaBaseline1
2. quote1   : ?<param>=KartikaBaseline1'
3. quote2   : ?<param>=KartikaBaseline1"
4. bool_true : ?<param>=KartikaBaseline1 AND 1=1
5. bool_false: ?<param>=KartikaBaseline1 AND 1=2

Sinyal dinilai terbuka (bobot tertulis di laporan, maks 100):
ERROR_SIG +50 (signature error DB baru + label DBMS), BOOL_DIFF +30
(TRUE vs FALSE beda), STATUS_DELTA +20, LENGTH_DELTA +10.
Ambang: >=50 SINYAL_KUAT, >=20 PERLU_TINJAU, sisanya TANPA_SINYAL.
Tiap verdict membawa severity usulan (HIGH/MEDIUM/INFO) siap dipetakan
ke Finding GARDA. Maks 5 parameter per run, diambil yang terburuk.

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

BOOL_TRUE_SUFFIX = " AND 1=1"
BOOL_FALSE_SUFFIX = " AND 1=2"

# -- Senjata ringan (proof eksekusi, BUKAN dump) -----------------------------
# Marker KONSTANTA hardcoded: user tidak bisa menyelipkan SQL sendiri.
# Proof hanya mencoba UNION SELECT atas string tetap ini (1..3 kolom),
# tanpa nama tabel/kolom, tanpa enumerasi skema, tanpa baca satu baris pun.
PROOF_MARKER = "KartikaProof"
PROOF_MAX_COLUMNS = 3

# signature -> label DBMS (untuk fingerprint, bukan eksploitasi).
DBMS_OF = {
    "you have an error in your sql syntax": "MySQL/MariaDB",
    "mysql_fetch": "MySQL/MariaDB",
    "mysqli": "MySQL/MariaDB",
    "pg_query": "PostgreSQL",
    "unterminated quoted string": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "odbc": "MSSQL/ODBC",
    "microsoft ole db": "MSSQL",
    "sql server": "MSSQL",
    "sqlite3": "SQLite",
    "ora-": "Oracle",
    "pl/sql": "Oracle",
}

# Marker proteksi (hanya dihitung bila respons quote 403/406 -- kabar baik).
WAF_MARKERS = (
    "modsecurity", "mod_security", "cloudflare", "sucuri", "akamai",
    "blocked by", "web application firewall", "request blocked",
)

# Bobot sinyal (heuristik terbuka, tertulis di laporan). Maks 100.
W_ERROR_SIG = 50
W_BOOL_DIFF = 30
W_STATUS_DELTA = 20
W_LENGTH_DELTA = 10

SEVERITY_OF = {
    "TERBUKTI": "HIGH",
    "SINYAL_KUAT": "HIGH",
    "PERLU_TINJAU": "MEDIUM",
    "TANPA_SINYAL": "INFO",
    "GAGAL_JALAN": "INFO",
}

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


def length_delta(a: str, b: str) -> bool:
    """True bila panjang respons berubah signifikan (relatif, bukan byte mentah)."""
    return abs(len(a) - len(b)) > max(50, len(b) // 4)


def dbms_of(signatures: list[str]) -> list[str]:
    """Petakan signature ke label DBMS (unik, urut)."""
    return sorted({DBMS_OF[s] for s in signatures if s in DBMS_OF})


def waf_hit(code: int | None, body: str) -> bool:
    """True bila proteksi terdeteksi (blokir 403/406 + marker dikenal)."""
    if code not in (403, 406):
        return False
    lowered = (body or "").lower()
    return any(marker in lowered for marker in WAF_MARKERS)


def assess(probes: dict) -> tuple[str, int, list[str], list[str], list[str]]:
    """Nilai 5 probe per parameter. Return (label, skor, sinyal, temuan, saran).

    probes: {"baseline": (code, body), "quote1": ..., "quote2": ...,
             "bool_true": ..., "bool_false": ...}. Skor 0-100 dari bobot
    terbuka; ambang: >=50 SINYAL_KUAT, >=20 PERLU_TINJAU, sisanya TANPA_SINYAL.
    """
    base = probes["baseline"]
    b_code, b_body = base
    if b_code is None:
        return ("GAGAL_JALAN", 0, [],
                [f"Baseline tidak terjangkau ({b_body}). Periksa aset dulu."],
                ["Pastikan aset aktif dan path benar sebelum menilai."])
    base_sig = set(find_db_signatures(b_body))
    quotes = [probes["quote1"], probes["quote2"]]
    new_sig = sorted({s for _, body in quotes for s in find_db_signatures(body)} - base_sig)

    score = 0
    signals: list[str] = []
    findings: list[str] = []
    advice: list[str] = []

    if new_sig:
        score += W_ERROR_SIG
        labels = dbms_of(new_sig) or ["tak dikenal"]
        signals.append(f"+{W_ERROR_SIG} ERROR_SIG[{', '.join(labels)}]")
        findings.append(f"Signature error DB muncul di probe quote: {', '.join(new_sig)}.")
        advice.append("Tinjau query di endpoint ini; pakai parameterized query/ORM binding; "
                      "jangan tampilkan error DB mentah ke klien (custom error page).")

    t_code, t_body = probes["bool_true"]
    f_code, f_body = probes["bool_false"]
    if t_code is not None and f_code is not None and (
            t_code != f_code or length_delta(t_body, f_body)):
        score += W_BOOL_DIFF
        signals.append(f"+{W_BOOL_DIFF} BOOL_DIFF(true {t_code}/{len(t_body)}B "
                       f"vs false {f_code}/{len(f_body)}B)")
        findings.append("Respons TRUE vs FALSE berbeda -- logika query terpengaruh input.")
        advice.append("Audit klausa WHERE/parameter; uji manual dengan akun uji di lab.")

    if any(code != b_code for code, _ in quotes):
        score += W_STATUS_DELTA
        codes = "/".join(str(code) for code, _ in [base] + quotes)
        signals.append(f"+{W_STATUS_DELTA} STATUS_DELTA({codes})")
    if any(length_delta(body, b_body) for _, body in quotes):
        score += W_LENGTH_DELTA
        signals.append(f"+{W_LENGTH_DELTA} LENGTH_DELTA")

    if waf_hit(quotes[0][0], quotes[0][1]) or waf_hit(quotes[1][0], quotes[1][1]):
        findings.append("WAF_TERDETEKSI: probe quote diblokir 403/406 oleh proteksi "
                        "-- kabar baik, pertahankan ruleset-nya.")
        advice.append("Pastikan proteksi juga menutup jalur POST dan parameter lain.")

    score = min(score, 100)
    if score >= 50:
        label = "SINYAL_KUAT"
    elif score >= 20:
        label = "PERLU_TINJAU"
        if not findings:
            findings.append(f"Perilaku berubah tanpa signature jelas (skor {score}).")
            advice.append("Uji manual dengan akun uji di lab; audit query dan input validation.")
    else:
        label = "TANPA_SINYAL"
        findings.append("Baseline, quote, dan boolean probe merespons konsisten, "
                        "tanpa signature error DB.")
        advice.append("Tetap lakukan code review query; probe 5-request bukan bukti aman penuh.")
    return label, score, signals, findings, advice


def aggregate(results: list[tuple[str, str]]) -> tuple[str, str]:
    """Pilih verdict terburuk dari banyak parameter. results: [(param, label)]."""
    rank = {"TERBUKTI": 4, "SINYAL_KUAT": 3, "PERLU_TINJAU": 2,
            "TANPA_SINYAL": 1, "GAGAL_JALAN": 0}
    worst = max(results, key=lambda item: rank.get(item[1], 0))
    return worst


def build_union_value(columns: int) -> str:
    """Bangun SATU nilai proof: UNION SELECT atas marker konstanta saja.

    Tidak ada input user di dalam string SQL -- kolom hanya menentukan berapa
    kali marker diulang. Daftar kolom/tabel tidak pernah disentuh.
    """
    consts = ",".join(f"'{PROOF_MARKER}{i}'" for i in range(1, columns + 1))
    return f"{BASELINE}' UNION SELECT {consts}-- "


def check_proof(baseline_body: str, proof_body: str) -> bool:
    """True bila marker muncul di respons proof tapi TIDAK di baseline."""
    return PROOF_MARKER in (proof_body or "") and PROOF_MARKER not in (baseline_body or "")


def try_proof(build, baseline_body: str) -> tuple[bool, int | None]:
    """Coba UNION 1..N kolom. Return (terbukti, jumlah_kolom|None)."""
    for columns in range(1, PROOF_MAX_COLUMNS + 1):
        _, body = fetch_probe(build(build_union_value(columns)))
        time.sleep(0.3)
        if check_proof(baseline_body, body):
            return True, columns
    return False, None


class KartikaSqliProbeAdapter(BaseIntegrationAdapter):
    """Probe SQLi 5-request per parameter untuk aset terdaftar dan aktif."""

    info = IntegrationInfo(
        tool_id="kartika_sqli_probe",
        display_name="Kartika SQLi Probe",
        description="Kirim 5 marker jinak per parameter (baseline, 2 quote, "
                    "boolean TRUE/FALSE) lalu nilai jadi skor + DBMS + severity. "
                    "Tanpa ekstraksi data.",
        official_repo="(port dari probe simulator offensive-lab Kartika -- stdlib)",
        required_env_vars=["KARTIKA_SQLI_PROBE_ENABLED"],
        capability_summary="Skor kerentanan injeksi SQL per parameter (bukan eksploitasi)",
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
        if not path.startswith("/") or ".." in path or any(ch.isspace() for ch in path):
            return ExecutionResult(False, "Parameter 'path' ditolak (absolut, tanpa spasi/..).")
        wanted: list[str] = []
        raw_params = params.get("params", params.get("param", "id"))
        candidates = raw_params if isinstance(raw_params, list) else str(raw_params).split(",")
        for cand in candidates[:5]:  # maks 5 parameter per run
            name = str(cand or "").strip()
            if name.replace("_", "").isalnum() and len(name) <= 64:
                wanted.append(name)
        if not wanted:
            return ExecutionResult(False, "Parameter 'param(s)' ditolak (alnum, maks 64 char, maks 5).")

        _, refusal = resolve_guard(host)
        if refusal:
            return ExecutionResult(False, refusal)

        def build(param: str, value: str) -> str:
            query = urllib.parse.urlencode({param: value})
            return f"{scheme}://{netloc(host, port)}{path}?{query}"

        prove = str(params.get("prove", "") or "").lower() in ("1", "true", "yes")

        def probe_param(param: str) -> tuple:
            fits = {
                "baseline": fetch_probe(build(param, BASELINE)),
                "quote1": None, "quote2": None, "bool_true": None, "bool_false": None,
            }
            time.sleep(0.3)
            fits["quote1"] = fetch_probe(build(param, BASELINE + "'"))
            time.sleep(0.3)
            fits["quote2"] = fetch_probe(build(param, BASELINE + '"'))
            time.sleep(0.3)
            fits["bool_true"] = fetch_probe(build(param, BASELINE + BOOL_TRUE_SUFFIX))
            time.sleep(0.3)
            fits["bool_false"] = fetch_probe(build(param, BASELINE + BOOL_FALSE_SUFFIX))
            label, score, signals, findings, advice = assess(fits)  # type: ignore[arg-type]
            proof_note = "proof dilewati (butuh prove=true + verdict SINYAL_KUAT)"
            # PAGAR proof: hanya bila user eksplisit minta DAN verdict sudah KUAT.
            if prove and label == "SINYAL_KUAT":
                base_body = fits["baseline"][1] or ""
                proven, columns = try_proof(lambda v: build(param, v), base_body)
                if proven:
                    label, score = "TERBUKTI", 100
                    signals = signals + [f"+PROOF(UNION {columns} kolom, marker konstanta)"]
                    findings = findings + [
                        f"EKSEKUSI SQL TERBUKTI: marker '{PROOF_MARKER}' dievaluasi DB "
                        f"(UNION {columns} kolom) -- tanpa baca tabel apa pun."]
                    advice = advice + ["Anggap endpoint ini COMPROMISED sampai query diperbaiki; "
                                       "putar kredensial DB bila endpoint menghadap publik."]
                    proof_note = f"TERBUKTI via UNION {columns} kolom"
                else:
                    proof_note = "proof dicoba, marker tidak terpantul (skor tetap)"
            return label, score, signals, findings, advice, proof_note

        try:
            per_param = [(param, *probe_param(param)) for param in wanted]
        except Exception as exc:  # kontrak: tidak boleh bocor jadi 500
            return ExecutionResult(False, f"Probe gagal jalan: {exc.__class__.__name__}")

        worst_param, _ = aggregate([(param, item[0]) for param, *item in per_param])
        w_label, w_score, w_signals, w_findings, w_advice, _ = next(
            item for param, *item in per_param if param == worst_param)
        detail = " | ".join(f"{param}={item[0]}({item[1]})" for param, *item in per_param)
        proof_line = " | ".join(f"{param}: {item[5]}" for param, *item in per_param)
        lines = [
            f"kartika_sqli_probe: {scheme}://{netloc(host, port)}{path} "
            f"-> {w_label} skor {w_score}/100 [{detail}].",
            "Sinyal: " + (" + ".join(w_signals) if w_signals else "-"),
            "Proof: " + proof_line,
            "Temuan: " + " | ".join(w_findings),
            "Rekomendasi: " + " | ".join(w_advice),
            f"Severity usulan: {SEVERITY_OF.get(w_label, 'INFO')} (siap dipetakan ke Finding GARDA).",
        ]
        return ExecutionResult(True, "\n".join(lines))

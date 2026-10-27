"""Kartika Load adapter -- ukur ketahanan aset terdaftar (DRAFT, belum untuk PR).

Port minimal dari offensive-lab v8 (Kartika, Flask single-file) ke kontrak
``BaseIntegrationAdapter`` GARDA. Ini BUKAN copy-paste: engine ditulis ulang
stdlib-only (urllib + threading), tanpa Flask, tanpa dependensi baru.

Yang SENGAJA dibatasi di draft ini (kejujuran scope, pola repo ini):
- Skenario hanya ``sustained`` dan ``burst``. ``slowloris``/``exhaustion``
  milik lab (uji ketahanan koneksi ke lab sendiri) terlalu agresif untuk
  platform SOC bersama -- butuh persetujuan dan isolasi sendiri (v2).
- Metode hanya GET. POST/body/cookie menyusul (v2) setelah ada audit trail
  yang mencatat body apa yang dikirim ke aset mana.
- Tanpa ramp kapasitas dan tanpa observasi /proc (hanya valid untuk target
  se-mesin; aset GARDA umumnya remote). Satu run, satu verdict.
- Guard jaringan menolak: hostname tak valid, IP unspecified/multicast/
  reserved, dan 169.254.169.254 (metadata cloud). IP private/loopback
  DIIZINKAN karena target load test adalah lab milik sendiri yang umumnya
  privat -- berbeda dari osint_domain yang public-only. Scope enforcement
  utama tetap di JobManager (aset harus ACTIVE terdaftar).

Batas keras (di-clamp di sini, bukan cuma di UI):
- durasi 1..KARTIKA_LOAD_MAX_DURATION (default 60 detik)
- thread 1..KARTIKA_LOAD_MAX_THREADS (default 16)
- request 1..KARTIKA_LOAD_MAX_REQUESTS (default 1000)
- rps 0..KARTIKA_LOAD_MAX_RPS (default 500, 0 = secepatnya)
"""
from __future__ import annotations

import ipaddress
import re
import socket
import threading
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from app.core.config import get_settings
from app.integrations.adapters.base import (
    BaseIntegrationAdapter,
    ExecutionResult,
    IntegrationInfo,
)

ALLOWED_SCENARIOS = ("sustained", "burst")
_HOST_RE = re.compile(r"[A-Za-z0-9.-]+")
# IP yang tidak pernah boleh jadi target uji beban, apa pun status asetnya.
FORBIDDEN_NETS = (
    ipaddress.ip_network("169.254.169.254/32"),  # metadata cloud (AWS/GCP/Azure)
    ipaddress.ip_network("0.0.0.0/8"),  # unspecified
    ipaddress.ip_network("224.0.0.0/4"),  # multicast
    ipaddress.ip_network("240.0.0.0/4"),  # reserved
)

REQUEST_TIMEOUT = 5.0


def clamp_int(value, low: int, high: int, default: int) -> int:
    """Coerce ke int lalu jepit ke [low, high]. Input sampah -> default."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))


def percentile(values: list[float], q: float) -> float | None:
    """Persentil nearest-rank. List kosong -> None (bukan 0 yang menipu)."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, min(len(ordered), -(-int(q * 100) * len(ordered) // 100)))
    return ordered[rank - 1]


def split_target(identifier: str) -> tuple[str, str] | None:
    """Pecah identifier aset jadi (host, path). Return None kalau tak valid."""
    raw = (identifier or "").strip()
    if not raw or len(raw) > 253 or any(ch.isspace() for ch in raw):
        return None
    if "://" in raw:
        scheme, _, rest = raw.partition("://")
        if scheme not in ("http", "https"):
            return None
    else:
        rest = raw
    host, _, path = rest.partition("/")
    if not host or not _HOST_RE.fullmatch(host) or ".." in host:
        return None
    # Tolak input yang sebetulnya IP mentah menyamar (konsisten dgn osint service).
    try:
        ipaddress.ip_address(host)
        return None
    except ValueError:
        pass
    return host, ("/" + path) if path else "/"


def resolve_guard(host: str, timeout: float = 4.0) -> tuple[list[str], str | None]:
    """Resolve host, tolak IP terlarang. Return (ips, alasan_penolakan|None)."""
    try:
        infos = socket.getaddrinfo(host, None, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
    except socket.gaierror:
        return [], f"Host '{host}' tidak bisa di-resolve."
    ips = sorted({info[4][0] for info in infos})
    for raw_ip in ips:
        try:
            parsed = ipaddress.ip_address(raw_ip)
        except ValueError:
            return [], f"Hasil resolve '{raw_ip}' bukan alamat IP valid."
        if any(parsed in net for net in FORBIDDEN_NETS):
            return [], f"Host '{host}' resolve ke {raw_ip} (terlarang untuk load test)."
    if not ips:
        return [], f"Host '{host}' tidak punya alamat IP."
    return ips, None


def classify_error(exc: BaseException | None) -> str:
    """Taksonomi error kecil: nama kelas exception -> bucket stabil."""
    name = exc.__class__.__name__ if exc is not None else ""
    if "Timeout" in name or "timeout" in name:
        return "timeout"
    if "refused" in name or "Refused" in name:
        return "refused"
    if "Reset" in name or "reset" in name:
        return "reset"
    if "Name" in name or "gaierror" in name:
        return "dns"
    return "other"


def run_load(url: str, scenario: str, duration: int, threads: int,
             max_requests: int, rps: int) -> dict:
    """Satu run sustained/burst. Murni stdlib, tanpa state global."""
    t0 = time.monotonic()
    deadline = t0 + duration
    latencies: list[float] = []
    statuses: Counter = Counter()
    errors: list[str] = []
    lock = threading.Lock()
    sent = 0
    barrier = threading.Barrier(threads) if scenario == "burst" else None
    pace_lock = threading.Lock()
    next_slot = [0.0]

    def pace() -> None:
        if not rps:
            return
        with pace_lock:
            now = time.monotonic()
            slot = max(next_slot[0], now)
            next_slot[0] = slot + 1.0 / rps
            wait = slot - now
        if wait > 0:
            time.sleep(wait)

    def fetch() -> tuple[int | None, float | None, str | None]:
        req = urllib.request.Request(url, method="GET",
                                     headers={"User-Agent": "GARDA-KartikaLoad/0.1"})
        start = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                resp.read(65536)
                return resp.status, (time.monotonic() - start) * 1000, None
        except urllib.error.HTTPError as exc:
            return exc.code, (time.monotonic() - start) * 1000, None
        except Exception as exc:  # transport gagal: taksonomi, bukan traceback
            return None, None, classify_error(exc)

    def worker() -> None:
        nonlocal sent
        while time.monotonic() < deadline:
            with lock:
                if sent >= max_requests:
                    return
                sent += 1
            if barrier is not None:
                try:
                    barrier.wait(timeout=2)
                except threading.BrokenBarrierError:
                    pass
            pace()
            code, dt_ms, kind = fetch()
            with lock:
                if code is None:
                    errors.append(kind or "other")
                else:
                    latencies.append(dt_ms or 0.0)
                    statuses[str(code)] += 1
            if scenario == "burst":
                time.sleep(1.0)

    with ThreadPoolExecutor(max_workers=threads) as pool:
        list(pool.map(lambda _: worker(), range(threads)))

    elapsed = max(time.monotonic() - t0, 0.001)
    total = len(latencies) + len(errors)
    http_errors = sum(n for code, n in statuses.items()
                      if code.isdigit() and int(code) >= 400)
    kinds = Counter(errors)
    for code, count in statuses.items():
        if code.isdigit() and int(code) >= 400:
            kinds["http5xx" if int(code) >= 500 else "http4xx"] += count
    p50 = percentile(latencies, 0.50)
    p95 = percentile(latencies, 0.95)
    return {
        "scenario": scenario,
        "duration_s": round(elapsed, 2),
        "threads": threads,
        "target_rps": rps or None,
        "requests_sent": total,
        "requests_ok": len(latencies),
        "requests_failed": len(errors),
        "error_rate_pct": round(100.0 * len(errors) / total, 2) if total else 0.0,
        "http_errors": http_errors,
        "achieved_rps": round(total / elapsed, 1) if elapsed else 0.0,
        "p50_ms": round(p50, 2) if p50 is not None else None,
        "p95_ms": round(p95, 2) if p95 is not None else None,
        "p99_ms": round(percentile(latencies, 0.99) or 0.0, 2) if latencies else None,
        "status_codes": dict(statuses),
        "error_kinds": dict(kinds),
    }


def analyze(result: dict) -> tuple[list[str], list[str]]:
    """Ubah angka jadi temuan + rekomendasi (maks 3 tiap sisi, jujur)."""
    findings: list[str] = []
    advice: list[str] = []
    codes = result["status_codes"]
    if not any(c == "429" or c == "403" for c in codes):
        findings.append("RATE_LIMIT_MISSING: tidak ada respons 429/403 selama run "
                        "(rate limit tidak terlihat aktif).")
        advice.append("Aktifkan rate limiting per IP di reverse proxy untuk endpoint ini.")
    p50, p95 = result["p50_ms"], result["p95_ms"]
    if p50 and p95 and p95 > max(3 * p50, p50 + 50):
        findings.append(f"QUEUE_BUILDUP: p95 ({p95} ms) jauh di atas p50 ({p50} ms) "
                        "-- antrean menumpuk di bawah beban.")
        advice.append("Periksa worker/thread pool dan timeout hulu; tambah autoscaling atau antrean.")
    if result["error_rate_pct"] > 1.0:
        findings.append(f"ERRORS_UNDER_LOAD: error rate {result['error_rate_pct']}% "
                        f"({result['error_kinds']}).")
        advice.append("Tentukan SLO error budget dan circuit breaker sebelum menaikkan beban.")
    if not findings:
        findings.append("STABLE: tidak ada degradasi terdeteksi pada profil uji ini.")
        advice.append("Naikkan profil (durasi/thread) bertahap untuk mencari titik lutut.")
    return findings[:3], advice[:3]


class KartikaLoadAdapter(BaseIntegrationAdapter):
    """Uji ketahanan (sustained/burst) untuk aset terdaftar dan aktif."""

    info = IntegrationInfo(
        tool_id="kartika_load",
        display_name="Kartika Load & Resilience",
        description="Ukur throughput, error rate, dan latensi p50/p95/p99 aset "
                    "terdaftar (skenario sustained/burst, GET saja).",
        official_repo="(port dari offensive-lab Kartika -- stdlib, tanpa upstream biner)",
        required_env_vars=["KARTIKA_LOAD_ENABLED"],
        capability_summary="Resilience measurement untuk aset sendiri (bukan serangan)",
        binary_name=None,
    )

    def is_installed(self) -> bool:
        return True  # stdlib-only: tidak ada binary yang perlu dicek

    def is_configured(self) -> bool:
        return bool(get_settings().KARTIKA_LOAD_ENABLED)

    def execute(self, asset_identifier: str, parameters: dict,
                timeout_seconds: int = 120) -> ExecutionResult:
        settings = get_settings()
        if not settings.KARTIKA_LOAD_ENABLED:
            return ExecutionResult(False, "Kartika Load dinonaktifkan (KARTIKA_LOAD_ENABLED=false).")
        params = parameters or {}
        scenario = str(params.get("scenario", "sustained")).lower()
        if scenario not in ALLOWED_SCENARIOS:
            return ExecutionResult(False, f"Skenario '{scenario}' ditolak (hanya sustained/burst di draft).")

        split = split_target(asset_identifier)
        if split is None:
            # Identifier boleh juga berupa URL penuh milik aset (http(s)://...).
            maybe_url = (asset_identifier or "").strip()
            if maybe_url.startswith(("http://", "https://")):
                host_part = maybe_url.split("://", 1)[1].partition("/")[0]
                split = split_target(host_part)
                if split is not None:
                    path = "/" + maybe_url.split("://", 1)[1].partition("/")[2]
                    split = (split[0], path or "/")
            if split is None:
                return ExecutionResult(False, f"Identifier '{asset_identifier}' bukan target valid.")
        host, path = split
        extra_path = str(params.get("path", "") or "").strip()
        if extra_path:
            if not extra_path.startswith("/") or ".." in extra_path or any(ch.isspace() for ch in extra_path):
                return ExecutionResult(False, "Parameter 'path' ditolak (harus path absolut tanpa spasi/..).")
            path = extra_path

        _, refusal = resolve_guard(host)
        if refusal:
            return ExecutionResult(False, refusal)

        duration = clamp_int(params.get("duration"), 1, settings.KARTIKA_LOAD_MAX_DURATION, 10)
        threads = clamp_int(params.get("threads"), 1, settings.KARTIKA_LOAD_MAX_THREADS, 4)
        max_requests = clamp_int(params.get("max_requests"), 1, settings.KARTIKA_LOAD_MAX_REQUESTS, 100)
        rps = clamp_int(params.get("rps"), 0, settings.KARTIKA_LOAD_MAX_RPS, 0)

        scheme = "https" if asset_identifier.strip().startswith("https://") else "http"
        url = f"{scheme}://{host}{path}"
        try:
            result = run_load(url, scenario, duration, threads, max_requests, rps)
        except Exception as exc:  # kontrak: tidak boleh bocor jadi 500
            return ExecutionResult(False, f"Load run gagal: {exc.__class__.__name__}")

        findings, advice = analyze(result)
        lines = [
            f"kartika_load/{scenario}: {result['requests_sent']} req, "
            f"error {result['error_rate_pct']}%, {result['achieved_rps']} rps, "
            f"p50 {result['p50_ms']} ms, p95 {result['p95_ms']} ms.",
            "Temuan: " + " | ".join(findings),
            "Rekomendasi: " + " | ".join(advice),
        ]
        return ExecutionResult(True, "\n".join(lines))

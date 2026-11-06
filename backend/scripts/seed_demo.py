#!/usr/bin/env python3
"""Isi database lokal GARDA CYBER dengan data contoh untuk demo/QA UI.

Kenapa script terpisah, bukan data di dalam aplikasi:
- Aplikasi tetap jujur: UI hanya menampilkan apa yang ada di API. Tidak ada
  angka karangan di komponen.
- Data ini benar-benar tersimpan sebagai baris di database lewat endpoint POST
  yang sama dengan yang dipakai manusia.

Batas:
- Hanya untuk database lokal. Jangan dijalankan ke server bersama.
- Beberapa endpoint TIDAK punya DELETE, jadi penghapusan harus manual:
  hapus file sqlite (lihat `DATABASE_URL`) atau hapus baris lewat SQL.
- Job yang dijalankan hanya `kartika_wa_phish` (analisis teks offline, tanpa
  koneksi jaringan). Tidak ada load test / probe jaringan dari script ini.

Pemakaian:
    python backend/scripts/seed_demo.py                       # http://127.0.0.1:8000
    python backend/scripts/seed_demo.py --base http://127.0.0.1:8010
    python backend/scripts/seed_demo.py --dry-run             # tampilkan rencana saja
    python backend/scripts/seed_demo.py --skip-existing       # lewati kalau sudah ada data
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

TAG = "[seed]"

ASSETS = [
    {"name": f"{TAG} Portal Akademik", "asset_type": "application", "identifier": "https://portal.lab.local",
     "owner": "Tim Akademik", "status": "active", "scope_notes": "Lab internal, diotorisasi untuk uji"},
    {"name": f"{TAG} API Internal", "asset_type": "application", "identifier": "https://api.lab.local",
     "owner": "Tim Platform", "status": "active", "scope_notes": "Lingkup uji: endpoint publik saja"},
    {"name": f"{TAG} Example Domain", "asset_type": "domain", "identifier": "example.com",
     "owner": "Tim Domain", "status": "active", "scope_notes": "Domain contoh publik untuk OSINT"},
    {"name": f"{TAG} Gateway Kantor", "asset_type": "device", "identifier": "10.10.0.1",
     "owner": "Tim Jaringan", "status": "pending_review", "scope_notes": "Belum diverifikasi pemiliknya"},
    {"name": f"{TAG} Host Cadangan", "asset_type": "ip", "identifier": "10.10.0.42",
     "owner": "Tim Infrastruktur", "status": "inactive", "scope_notes": "Dimatikan sementara"},
]

FINDINGS = [
    ("TLS certificate hampir kedaluwarsa", "osint", "high", "osint_domain"),
    ("Header HSTS belum aktif", "osint", "medium", "osint_domain"),
    ("SPF record tidak ada", "osint", "medium", "osint_domain"),
    ("DMARC policy masih p=none", "osint", "low", "osint_domain"),
    ("Kunci API terdeteksi di bundle publik", "secret_exposure", "high", "github_exposure"),
    ("Token uji ditemukan di repo publik", "secret_exposure", "medium", "github_exposure"),
    ("Alamat IP pernah dilaporkan spam", "ip_reputation", "low", "ip_intelligence"),
    ("Port manajemen terbuka ke internet", "other", "high", "manual_review"),
]

INCIDENTS = [
    ("Percobaan login gagal berulang di portal", "Terlihat lonjakan login gagal dari satu rentang IP.", "Analis 1"),
    ("Kunci API bocor di repositori publik", "Kunci sudah dicabut, menunggu verifikasi pemakaian.", "Analis 2"),
    ("Sertifikat TLS akan kedaluwarsa", "Perlu perpanjangan sebelum tanggal habis.", None),
    ("Laporan spam dari penyedia reputasi", "Perlu pembersihan relay surel.", "Analis 1"),
]

WA_SAMPLES = [
    "PENTING! Akun Anda akan diblokir. Verifikasi sekarang di http://bit.ly/verifikasi-akun dalam 10 menit atau akun dihapus permanen.",
    "Selamat, Anda menang undian. Kirim kode OTP dan PIN Anda ke admin untuk klaim hadiah.",
]


def post(base: str, path: str, payload: dict, dry: bool) -> dict | None:
    url = f"{base}{path}"
    if dry:
        print(f"  POST {path}  {json.dumps(payload, ensure_ascii=False)[:90]}…")
        return None
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")[:200]
        print(f"  ! POST {path} gagal {exc.code}: {body}")
        return None
    except urllib.error.URLError as exc:
        print(f"  ! tidak bisa menghubungi {url}: {exc.reason}")
        return None


def patch(base: str, path: str, payload: dict) -> None:
    req = urllib.request.Request(f"{base}{path}", data=json.dumps(payload).encode(), method="PATCH",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            res.read()
    except (urllib.error.HTTPError, urllib.error.URLError):
        pass


def get(base: str, path: str):
    try:
        with urllib.request.urlopen(f"{base}{path}", timeout=15) as res:
            return json.loads(res.read().decode() or "[]")
    except (urllib.error.HTTPError, urllib.error.URLError):
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Seed data demo GARDA CYBER (lokal)")
    ap.add_argument("--base", default="http://127.0.0.1:8000", help="URL backend")
    ap.add_argument("--dry-run", action="store_true", help="hanya tampilkan rencana")
    ap.add_argument("--skip-existing", action="store_true", help="batalkan kalau sudah ada data bertanda seed")
    args = ap.parse_args()
    base = args.base.rstrip("/")

    existing = get(base, "/api/v1/assets")
    if existing is None:
        print(f"Backend tidak menjawab di {base}/api/v1/assets. Jalankan uvicorn dulu.")
        return 1
    already = [a for a in existing if str(a.get("name", "")).startswith(TAG)]
    if already and args.skip_existing:
        print(f"Sudah ada {len(already)} aset bertanda {TAG}; dilewati (--skip-existing).")
        return 0

    now = datetime.now(timezone.utc)
    print(f"Base: {base}{'  [DRY RUN]' if args.dry_run else ''}")

    print("1) Aset")
    for asset in ASSETS:
        post(base, "/api/v1/assets", asset, args.dry_run)

    print("2) Temuan")
    for idx, (title, category, confidence, source) in enumerate(FINDINGS):
        collected = (now - timedelta(days=idx, hours=idx * 3)).isoformat()
        post(base, "/api/v1/findings", {
            "category": category,
            "title": f"{TAG} {title}",
            "description": f"Contoh temuan untuk demo UI ({source}).",
            "source": source,
            "confidence": confidence,
            "collected_at": collected,
            "dedupe_key": f"seed-{category}-{idx}",
        }, args.dry_run)

    print("3) Insiden")
    incident_ids = []
    for title, summary, assigned in INCIDENTS:
        res = post(base, "/api/v1/incidents", {
            "title": f"{TAG} {title}",
            "summary": summary,
            "assigned_to": assigned,
        }, args.dry_run)
        if res and res.get("id"):
            incident_ids.append(res["id"])

    # Triase sebagian temuan supaya diagram status tidak seragam.
    if not args.dry_run:
        findings = get(base, "/api/v1/findings?limit=200") or {}
        seeded = [f for f in findings.get("items", []) if str(f.get("title", "")).startswith(TAG)]
        for i, f in enumerate(seeded):
            status = ["triaged", "remediated", "false_positive"][i % 3] if i % 4 == 0 else "open"
            if status != "open":
                patch(base, f"/api/v1/findings/{f['id']}", {"status": status})
        print(f"   status {len(seeded)} temuan disesuaikan")

    print("4) Job (kartika_wa_phish — offline, tanpa jaringan)")
    assets = get(base, "/api/v1/assets") or []
    label_asset = next((a for a in assets if str(a.get("name", "")).startswith(TAG)), None)
    if label_asset:
        for msg in WA_SAMPLES:
            post(base, "/api/v1/jobs", {
                "tool_id": "kartika_wa_phish",
                "asset_id": label_asset["id"],
                "parameters": {"message": msg},
            }, args.dry_run)
    else:
        print("  (tidak ada aset seed untuk dijadikan label job)")

    print("Selesai. Buka dashboard, Findings, Insiden, Job Manager, dan Reports.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

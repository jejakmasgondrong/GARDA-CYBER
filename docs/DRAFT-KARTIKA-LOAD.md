# DRAFT: Kartika Load adapter untuk GARDA-CYBER (belum untuk PR)

Status: draft di branch `draft/kartika-load`, fork `jejakmasgondrong/GARDA-CYBER`.
Repo offensive-lab (Kartika) TIDAK diubah sama sekali.

## Masalah yang ditutup (Gap 1 + sebagian Gap 4)

1. GARDA tidak punya uji ketahanan sama sekali; Job Manager hanya mengeksekusi
   tool eksternal (nmap/nuclei/amass) yang butuh binary terpasang.
2. Lab Kartika punya engine load & resilience (v8) tapi hasilnya JSON lepas
   tanpa DB, tanpa temuan terstruktur, tanpa audit trail.

Adapter ini membungkus engine minimal (sustained/burst, GET) ke kontrak
`BaseIntegrationAdapter` sehingga hasilnya masuk Job (tersimpan + teraudit)
dan bisa dibaca frontend Red Team apa adanya.

## File

| File | Isi |
|---|---|
| `backend/app/integrations/adapters/kartika_load_adapter.py` | Adapter + engine stdlib (~360 baris) |
| `backend/app/core/config.py` | 5 env baru `KARTIKA_LOAD_*` |
| `backend/app/integrations/registry.py` | Daftarkan `KartikaLoadAdapter()` |
| `backend/tests/test_kartika_load_adapter.py` | 7 test (pure + echo lokal, tanpa internet) |

## Kontrak eksekusi

`POST /api/v1/jobs` dengan:

```json
{
  "tool_id": "kartika_load",
  "asset_id": "<uuid aset ACTIVE>",
  "parameters": {
    "scenario": "sustained",
    "duration": 10,
    "threads": 4,
    "max_requests": 100,
    "rps": 0,
    "path": "/"
  }
}
```

Semua angka di-clamp server-side (60 dtk / 16 thread / 1000 req / 500 rps).
Target = `asset.identifier` (domain atau URL http(s)); path opsional menimpa.
Scope enforcement ganda: JobManager menolak aset non-ACTIVE; adapter menolak
identifier tak valid + resolve ke IP terlarang (metadata cloud, unspecified,
multicast, reserved). Private/loopback DIIZINKAN (lab sendiri umumnya privat)
-- alasan tertulis di docstring adapter.

## Yang SENGAJA tidak ikut (v2)

- slowloris/exhaustion, ramp kapasitas, observasi /proc, POST/body/cookie.
- Auto-create Finding dari hasil run (butuh keputusan mapping severity).
- Entri frontend `RED_TEAM_TOOLS` + env di `.env.example` + merge ke README.

## Ronde 2 (draft lanjut): kartika_sqli_probe + kartika_wa_phish

| Adapter | Cara pakai | Batas |
|---|---|---|
| `kartika_sqli_probe` | `POST /jobs` `{tool_id, asset_id, parameters: {path: "/", param: "id"}}` -- 3 request GET jinak (baseline + 2 quote), baca pantulan error DB | Tanpa ekstraksi data/UNION/stacked/auth-bypass; verdict SINYAL_KUAT / PERLU_TINJAU / TANPA_SINYAL, selalu butuh tinjauan manual |
| `kartika_wa_phish` | `POST /jobs` `{tool_id, asset_id: "<label kasus>", parameters: {message: "<teks tempelan 10..4000 char>"}}` -- skor offline, tanpa network | TANPA API/scraping WhatsApp (ToS + privasi); 7 aturan transparan, ambang RENDAH 0-2 / WASPADA 3-5 / TINGGI 6+, bobot heuristik awal belum dikalibrasi |

Test ronde 2: `python backend/tests/test_kartika_probe_wa.py` = 8/8 PASS
(echo lokal, signature MySQL, anti-false-positive baseline, status-delta,
spam ID -> TINGGI, benign -> RENDAH, satu-hit-per-aturan).
Total draft: 15/15 (7 load + 8 probe/WA). Commit `draft: ...probe + WA...`.

## Ronde 3: wa_number_lookup (kontrak kinghacker0/WhatsApp-OSINT, bukan kodenya)

Repo `kinghacker0/WhatsApp-OSINT` (MIT, 1.3k stars) dibaca di
`repos/WhatsApp-OSINT`: CLI 351 baris membungkus RapidAPI berbayar
(`whatsapp-osint.p.rapidapi.com`, 6 endpoint, header x-rapidapi-key/host,
validasi digit 8-15). Yang dipakai HANYA kontrak HTTP-nya.

| File baru | Isi |
|---|---|
| `backend/app/integrations/providers/wa_number_provider.py` | Provider httpx (pola AbuseIPDB): 4 endpoint diizinkan (`about`, `business`, `devices`, `privacy`); foto `b64` + full dump `dck` SENGAJA ditutup (privasi + blob) |
| `backend/app/integrations/adapters/wa_lookup_adapter.py` | Adapter `wa_number_lookup`: wajib `case_ref` (tolak tanpa konteks kasus) + `phone` + endpoint allowlist |
| `backend/tests/test_wa_lookup.py` | 7 test mock (tanpa key/internet): validasi nomor, tanpa-key jujur, endpoint-ditolak, OK + ringkasan, 429, case_ref wajib, flag kontrak |

Env: `WA_OSINT_ENABLED` + `WA_OSINT_RAPIDAPI_KEY` (kosong = modul mati rapi,
`configured/executable: False`). Key TIDAK PERNAH masuk output/log.
Ketergantungan jujur: API berbayar pihak ketiga (kuota di RapidAPI),
sumbernya scraping jadi bisa berubah -- enrichment opsional, bukan core.

Test: `python backend/tests/test_wa_lookup.py` = 7/7 PASS.
Total draft: 22/22. Bug kecil ketemu: restore `staticmethod` hasil monkeypatch
harus pakai `Class.__dict__[name]`, bukan akses atribut (jadi function biasa
-> TypeError saat dipanggil via self). Commit `draft: ...wa lookup...`.

## Verifikasi

- `python -m py_compile` semua file berubah: OK.
- `python backend/tests/test_kartika_load_adapter.py`: 7/7 PASS
  (echo `http.server` lokal, resolve-guard via monkeypatch, tanpa internet).
- Full suite (`pytest`) + `test_integrations_registry` (butuh tambah
  `kartika_load` ke expected set) belum dijalankan di sini -- deps backend
  (fastapi/sqlalchemy) tidak ada di mesin draft; wajib hijau sebelum PR.

## Demo 3 menit untuk kawan

1. Daftarkan aset lab lokal, set ACTIVE.
2. `POST /jobs` kartika_load/sustained 10 dtk ke aset itu.
3. Tunjukkan ringkasan: req, error%, rps, p50/p95 + temuan RATE_LIMIT_MISSING
   + rekomendasi. Bandingkan sebelum/sesudah rate limit dinyalakan.

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

## Ronde 6: senjata ringan -- constant-proof UNION (2026-10-27)

`prove=true` + verdict SINYAL_KUAT = adapter mencoba UNION SELECT atas
marker KONSTANTA hardcoded (`KartikaProof`, 1..3 kolom). Marker terpantul
-> `TERBUKTI` skor 100 + severity HIGH. Tanpa nama tabel/kolom, tanpa
enumerasi, tanpa baca baris data; user tidak bisa selipkan SQL sendiri;
tanpa kedua pagar proof tidak pernah dikirim. Live-test: TERBUKTI via
UNION 1 kolom; pagar prove=false -> tetap SINYAL_KUAT + "proof dilewati".
Test: 25/25 (9 load + 16 probe/WA, termasuk template-SQL-murni dan stub
UNION). Bug unpack 6-tuple ketahuan dari live-test, bukan unit test.
Commit `draft: ...constant proof...`.

## Ronde 5: SQLi v2 -- skor + DBMS + multi-param (2026-10-27)

Naik dari 3 ke 5 probe per parameter (tambah boolean TRUE/FALSE
`AND 1=1` vs `AND 1=2` -- teknik differential standar, tetap tanpa
ekstraksi data). Sinyal berbobot terbuka: ERROR_SIG +50, BOOL_DIFF +30,
STATUS_DELTA +20, LENGTH_DELTA +10; ambang >=50 KUAT, >=20 TINJAU.
Bonus: fingerprint DBMS dari signature, deteksi WAF (403/406 + marker),
multi-param (maks 5, diambil terburuk), severity usulan HIGH/MEDIUM/INFO
siap dipetakan ke Finding. Bobot STATUS 10 -> 20 karena 500 gara-gara
quote memang pantas TINJAU (ketahuan dari test yang gagal jujur).

Live-test vs stub vuln: `SINYAL_KUAT skor 100/100 [id + q]` --
MySQL/MariaDB terlabel, BOOL_DIFF terbaca (173B vs 20B), severity HIGH.
Test: 21/21 (9 load + 12 probe/WA). Commit `draft: ...sqli v2...`.

## Ronde 4: split_target terima host:port + IP literal (2026-10-27)

Bug ketemu sendiri: `split_target` menolak `127.0.0.1:8890` (colon gagal
regex + IP literal ditolak) -- padahal target lab selalu host:port. Fix:
`parse_hostport` (port 1..65535, IPv6 wajib bracket, IP literal diizinkan)
+ `netloc` (bracket ulang IPv6) di `kartika_load_adapter.py`; kedua adapter
(`load`, `sqli`) sekarang unpack 3-tuple dan guard tetap via `resolve_guard`
di bare host. Test load 7 -> 9.

Live-test (echo + stub vuln lokal, tanpa internet):
- echo sehat -> TANPA_SINYAL (200/200/200)
- stub muntah error SQL saat quote -> SINYAL_KUAT + signature terbaca
- port mati -> GAGAL_JALAN jujur (TRANSPORT, tanpa crash)
- load/burst 8 req vs echo -> angka + RATE_LIMIT_MISSING
Total draft: 17/17. Commit `draft: ...host:port...`.

## Ronde 3: wa_number_lookup -- DICABUT (2026-10-27)

Alasan: butuh RapidAPI key BERBAYAR dan tidak ada key yang tersedia --
repo `kinghacker0/WhatsApp-OSINT` cuma kasih placeholder
(`RAPIDAPI_KEY=tu_api_key_aqui`), tanpa key modul ini mati total.
Sesuai prinsip repo (tidak ada modul pajangan), provider + adapter + test
ronde 3 dihapus dari branch. Tidak ada yang hilang permanen: kodenya aman
di history commit `f96a2aa`, tinggal `git cherry-pick`/`revert` kalau key
sudah ada. Clone referensi `repos/WhatsApp-OSINT` tetap di disk (di luar
repo GARDA) untuk dipakai nanti.

Yang TETAP ADA dan jalan tanpa key: `kartika_wa_phish` (analisis teks
tempelan offline) + hasil tes gratis nomor (`wa.me` valid, prefix Telkomsel,
nol jejak publik) tercatat di percakapan, bukan di repo (privasi nomor).

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

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

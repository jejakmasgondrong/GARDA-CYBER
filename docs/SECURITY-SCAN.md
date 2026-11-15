# Keamanan — Scan Zip Kiriman Kawan

Verdict: **BERSIH** (0 infected). Scan ClamAV penuh terhadap zip kiriman kawan
untuk submission hackathon, sebelum apa pun di-extract atau di-upload.

## Yang di-scan

| Item | Nilai |
|---|---|
| File | GARDA-CYBER.zip (kiriman kawan) |
| Ukuran | 132,194,016 byte |
| SHA-256 | `e7ad3f0ee7e1b108c947ff521274064d548571cbb620d61bfad2c838ad3bf477` |
| Isi | 1,727 file setelah dedup: `GARDA-CYBER.exe` (34,569,424 B, md5 `76ef37166fc5aa787c2cdfddbc3f228e`) + `tools/` (amass.exe, nmap/, nuclei.exe) + `.env` demo |

## Scanner

- ClamAV 1.5.4/28169, database daily.cvd 2026-11-14 20:59, 3,628,275 signature
  (freshclam via `/tmp/opencode/clamav-db` — workaround AppArmor laptop ini).

## Hasil (scan6, 2026-11-14 23:19:21 → 23:26:22)

- Data scanned: 207.96 MiB (295.64 MiB read, ratio 0.70:1)
- 1,726 file OK + 1 Empty file = 1,727 file
- **Infected files: 0**
- Waktu: 420.650 detik (7 m 0 s), exit code 0

## Jebakan yang ditangani

1. Run pertama: 883 file zenmap tidak ter-scan (permission) → scan ulang penuh, bersih.
2. 1,724 duplikat `__N` + `tools/nuclei__1.exe` dibuang setelah dibuktikan
   byte-identical via `cmp` — sebelum scan final.
3. `GARDA-CYBER.exe` adalah bundle PyInstaller: md5-nya tidak bisa dicocokkan dengan
   sumber mana pun (by design). Bukti kebersihan = scan ClamAV + hash zip, bukan md5 exe.

## Perbandingan dengan repo rilis

- Zip vs repo GARDA-CYBER v0.5.3: BOTH=0 — tidak ada file yang sama.
  Zip = Windows demo bundle, bukan source repo.

## Yang tidak di-upload ke release

- `.env` (berisi `DEMO_PROVIDER_ENABLED=true`, bukan secret) — sengaja tidak diikutsertakan.

## Aset release v0.5.3 (fork PUBLIC jejakmasgondrong/GARDA-CYBER)

- `Manual-Book-GARDA-CYBER.pdf` (4,638,676 B) — manual book v0.5.3.
- `tools.zip` (275,822,438 B, 1,725 file) — amass.exe, nmap/, nuclei.exe, hasil scan bersih.

Catatan 2026-11-15: `GARDA-CYBER.exe` (34,569,424 B) dihapus dari release atas
permintaan pemilik — seluruh dokumentasi kini mengarahkan instal resmi ke
`setup.bat` (Windows) / `bash setup.sh` (Linux/macOS). Bukti scan di file ini
tetap berlaku sebagai arsip forensik isi zip kiriman kawan.

## Bukti mentah

- Log lengkap: `docs/garda-scan6.log` (verbatim, di-commit bersama file ini).
- Zip asli + hasil extract bersih disimpan permanen di workspace lokal
  (`GARDA-CYBER-submit/`, di luar git karena 132 MB terlalu besar untuk repo).

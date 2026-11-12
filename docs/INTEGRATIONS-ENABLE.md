# Mengaktifkan integrasi GARDA CYBER di mesin ini

Tanggal: 2026-11-06, diperbarui 2026-11-11. Semua langkah di bawah **tanpa sudo**
— tidak ada perubahan pada sistem, semuanya masuk ke `~/.local` dan `~/go/bin`.

## Hasilnya

| Sebelum | Sesudah |
|---|---|
| 4 dari 15 aktif (3 Kartika + OSINT) | **9 dari 15 jalan nyata, 1 pajangan, 5 locked** |

Tool yang sekarang benar-benar jalan (diverifikasi dengan job nyata, bukan cuma
status "configured"):

| Tool | Uji yang dijalankan | Hasil |
|---|---|---|
| `nmap` | `-sV` ke `127.0.0.1` | completed, versi terdeteksi |
| `nuclei` | scan ke `http://127.0.0.1:8010` (API sendiri) | completed, menemukan `openapi`, `swagger-api`, `tech-detect: uvicorn` |
| `amass` | enumerasi pasif `example.com` | completed, NS + A + AAAA record |
| `kartika_load` | sustained 3 dtk, 8 req, target API sendiri | completed, 9,5 rps, p50 190 ms, temuan `RATE_LIMIT_MISSING` |
| `kartika_sqli_probe` | parameter `id` di API sendiri | completed, `TANPA_SINYAL` skor 0/100 |
| `kartika_wa_phish` | analisis teks (offline) | completed, skor 6 = TINGGI |
| `github_exposure` | scan repo `jejakmasgondrong/GARDA-CYBER` | completed, 200 file diperiksa, 0 finding baru (dedup jalan) |
| `ip_reputation` | lookup `8.8.8.8` | completed, klasifikasi `public`, **dijawab provider demo** (lihat § Mode demo) |
| `osint_domain` | lookup `example.com` | completed, 4 alamat A/AAAA + MX/NS/TXT + sertifikat TLS Cloudflare (anti-SSRF dijalankan DNS service) |

**Batas waktu yang diakui:** `github_exposure` berjalan sinkron di job manager
(enggak ada antrian/worker). Scan repo besar memakan waktu menit — job
`jejakmasgondrong/GARDA-CYBER` butuh ~2 menit. Ini keterbatasan desain yang
sengaja dipakai, didokumentasikan di sini, bukan ditutup-tutupi.

## Cara mengulang di mesin lain

```bash
bash scripts/install_optional_tools.sh --check   # lihat apa yang sudah ada
bash scripts/install_optional_tools.sh           # pasang yang belum ada
```

Script memasang:

1. **nmap** — paket `.deb` (`nmap`, `nmap-common`, `liblinear4`, `liblua5.3-0`,
   `libssh2-1t64`) diekstrak ke `~/.local/opt/nmap`, lalu dibuat wrapper
   `~/.local/bin/nmap` yang mengeset `LD_LIBRARY_PATH` dan `--datadir`.
   Tanpa wrapper, binary hasil ekstrak gagal dengan `liblinear.so.4: not found`.
2. **nuclei** — binary rilis resmi + template (`~87 MB`, sekali saja).
   Penting: template diunduh **sebelum** dipakai. Kalau tidak, run pertama
   melewati batas waktu 60 detik adapter dan job tercatat gagal.
3. **amass v4.2.0** — dibangun via `go install`. **Bukan v5**: mulai v5, amass
   pecah jadi klien + service "engine" terpisah, sehingga `amass enum` gagal
   dengan `The Amass engine did not respond`. Adapter memanggil binary langsung,
   jadi yang dipakai v4.

Lalu:

```bash
echo 'NMAP_BINARY=$HOME/.local/bin/nmap' >> backend/.env
```

`NMAP_BINARY` wajib diisi karena `NmapAdapter.is_configured()` membacanya —
tanpa itu statusnya "belum dikonfigurasi" walau binary ada di PATH.

## Yang masih pajangan (sigma)

`sigma` — `is_configured()` di adapter-nya **hardcoded `return False`**, dan
`execute()` masih memakai default base class ("belum diimplementasikan").
Jadi ia pajangan, bukan integrasi. Untuk mengaktifkan perlu implementasi
adapter + sumber data nyata.

## Locked (5 tool)

Lima tool ini punya kode adapter, tapi sengaja dikunci untuk rilis ini
(kebutuhan server/daemon eksternal atau keputusan product). Job manager
menolak eksekusinya dengan kalimat yang sama seperti yang tampil di halaman
Integrations:

> fitur locked, silahkan hubungi tim Luzsec 1

| Tool | Yang dibutuhkan |
|---|---|
| `owasp_zap` | ZAP daemon + `OWASP_ZAP_URL` + `OWASP_ZAP_API_KEY` |
| `wazuh` | server Wazuh + `WAZUH_API_URL` + user + password |
| `suricata` | engine IDS/IPS terpasang + aturan (belum ada kontrak konfigurasi resmi di Tahap 1) |
| `osquery` | daemon osquery + konfigurasi query (belum ada kontrak konfigurasi resmi di Tahap 1) |
| `greenbone` | scanner Greenbone/OpenVAS + kredensial (belum ada kontrak konfigurasi resmi di Tahap 1) |

Total: 9 jalan nyata + 1 pajangan (sigma) + 5 locked = 15.

## Mode demo (ip_reputation)

`ip_reputation` jalan tanpa `ABUSEIPDB_API_KEY` karena ada fallback provider
demo. Ini **bukan** reputasi nyata — sengaja dilabel di mana pun muncul:

- Job summary selalu membawa kalimat: *"karena keterbatasan waktu dan sumber
  daya, maka fungsi tidak sampai berjalan karena butuh api berbayar"* plus
  tanda `[DATA DEMO -- bukan reputasi nyata]`.
- Endpoint `/integrations` mengirim `demo_mode: true` untuk tool ini, dan
  halaman Integrations menampilkan badge "Mode Demo" + penjelasan.

Kalau `ABUSEIPDB_API_KEY` diisi nanti, `is_configured()` tetap `true`, provider
demo otomatis tidak dipakai, dan badge hilang.

## Yang aktif tapi punya batas jujur

| Tool | Batasnya |
|---|---|
| `github_exposure` | hanya repo yang terdaftar di `GITHUB_EXPOSURE_ALLOWED_REPOS` yang diperiksa; scan sinkron bisa menit untuk repo besar |
| `ip_reputation` | tanpa AbuseIPDB key, jawabannya data demo (lihat § Mode demo) |

## Jebakan yang ketemu saat mengerjakan ini

1. **`DATABASE_URL` relatif ke CWD.** `sqlite:///./garda_cyber.db` membuat
   database di folder tempat uvicorn dijalankan. Menjalankan dari root repo vs
   dari `backend/` menghasilkan dua database berbeda, dan data "hilang".
   Sekarang `backend/.env` memakai path absolut.
2. **`settings` membaca `.env` relatif ke CWD juga** — supaya `backend/.env`
   terbaca, backend dijalankan dengan `cd backend` (atau beri env var langsung).
3. **`nmap` hasil ekstrak `.deb` butuh wrapper**, bukan cukup satu path binary.

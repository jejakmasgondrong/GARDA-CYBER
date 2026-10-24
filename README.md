# GARDA CYBER

Platform operasi keamanan siber modular. Dokumen ini mencakup Tahap 1 (fondasi)
dan Tahap 2 (IP Intelligence, Findings & Incident Management, perluasan
Integration Registry) — **bukan seluruh Tahap 2** yang diminta; lihat bagian
"Yang Belum Diimplementasikan" untuk rincian jujur.

**Tidak ada data keamanan palsu di proyek ini.** Workspace yang belum punya
sumber data nyata menampilkan empty state ("belum ada data"), bukan metrik rekaan.

## 1. Prasyarat

- Python 3.11+
- Node.js 20+ dan npm
- Docker Desktop (opsional, untuk deployment lokal via Compose)
- Instruksi di bawah ditulis untuk **Windows PowerShell**

## 2. Struktur Proyek

```
GARDA-CYBER/
  backend/
    app/
      api/v1/           health, assets, integrations, ip_intelligence,
                         findings, incidents, audit_logs
      core/             config.py, logging.py
      db/               session.py, base.py
      models/           Asset, Alert, Incident, AuditLog, IntegrationRegistryEntry,
                         Finding, InvestigationCase, IpLookup
      schemas/          Pydantic schemas (Create/Update/Read per model)
      repositories/     akses data (asset, finding, incident, audit_log, ip_lookup)
      services/         business logic + audit logging (asset, finding, incident,
                         ip_lookup, audit, ip_classification, redaction)
      integrations/
        adapters/       Nmap, ZAP, Wazuh, Suricata, Sigma, osquery, Greenbone,
                         OSINT (belum implementasi), GitHub Exposure (belum implementasi),
                         IP Reputation (demo provider)
        providers/      kontrak provider IP reputation + DemoIpProvider
        registry.py     daftar pusat semua adapter/provider
      main.py           entry point FastAPI
    tests/              35 test — lihat bagian "Hasil Pengujian"
    requirements.txt / pytest.ini / .env.example
  frontend/
    src/
      components/       Sidebar, TopBar, StatCard, EmptyState
      pages/            10 halaman workspace (lihat tabel status di bawah)
      lib/apiClient.ts  API client terpusat (VITE_API_BASE_URL)
      types/            tipe TypeScript bersama
    package.json / vite.config.ts / tailwind.config.js / .env.example
  deployment/
    Dockerfile.backend, Dockerfile.frontend, docker-compose.yml, README.md
```

## 3. Menjalankan di Windows (PowerShell)

### Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```
- API: `http://localhost:8000`
- Dokumentasi otomatis: `http://localhost:8000/docs`
- Health check: `GET http://localhost:8000/api/v1/health`

### Frontend
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```
- UI: `http://localhost:5173` (jalankan backend dulu, kalau tidak halaman akan
  menampilkan pesan "Backend belum terhubung" — bukan data palsu)

### Test
```powershell
cd backend
python -m pytest -q

cd ..\frontend
npm run build
```

## 4. Status Tiap Workspace (jujur, per halaman)

| Workspace | Status |
|---|---|
| Overview | Terhubung ke `/health` dan `/assets` nyata |
| Asset Inventory | CRUD penuh, terhubung API nyata |
| IP Intelligence | **Selesai & diuji.** Klasifikasi IPv4/IPv6, scope enforcement di backend (bukan cuma frontend), provider demo berlabel jelas, history tersimpan di DB |

| Blue Team | **Baru:** terhubung ke `/incidents` (CRUD dasar), tabel+empty state nyata |
| Audit Logs | **Baru:** terhubung ke `/audit-logs`, mencatat aksi create/update finding & incident |
| Integrations | Menampilkan status jujur per tool: `implemented` (ada kode adapter) vs `configured` (env var terisi) |
| Attack Surface | **Selesai & diuji.** OSINT Domain Intelligence: DNS+TLS lookup dengan enforcement anti-SSRF di backend |
| Vulnerability Management | **Selesai & diuji.** Findings dari semua sumber + panel GitHub Exposure Monitor (scan repo langsung dari UI) |
| Red Team | Tool catalog dari registry; eksekusi scan nyata **belum** ditambahkan pada pass ini |
| Reports | Empty state — menunggu data Finding/Incident lebih banyak untuk diringkas |
| Settings | Halaman dasar, belum ada manajemen user/role (menunggu autentikasi) |

## 5. Yang Benar-Benar Diselesaikan di Pass Ini (Prioritas dari brief Tahap 2)

- **Prioritas A — IP Intelligence**: diaudit, sudah solid sejak sebelumnya
  (klasifikasi lengkap termasuk unspecified/loopback/link-local/multicast/
  private/reserved/public, scope enforcement backend, provider demo berlabel
  jelas, history+pagination). Tidak perlu perbaikan besar.
- **Prioritas D — Findings & Incident Management**: diimplementasikan dari
  nol (model sudah ada sebelumnya, tapi repository/schema/service/API/test/
  frontend belum ada sama sekali). Sekarang: CRUD dasar + filter + pagination,
  dedupe key mencegah finding duplikat, audit log otomatis tercatat tiap create/update.
- **Prioritas E — Integration Registry (sebagian)**: ditambahkan entri untuk
  `ip_reputation`, `osint_domain`, `github_exposure` dengan field baru
  `implemented` supaya jujur membedakan "belum ditulis kodenya" vs "sudah ada
  adapter tapi belum dikonfigurasi env var-nya".
- **Bug lama diperbaiki**: `frontend/src/vite-env.d.ts` hilang dari proyek
  sebelumnya, menyebabkan `npm run build` gagal (`ImportMeta.env` tidak
  dikenali TypeScript). Sudah ditambahkan dan diverifikasi build lolos.

## 5b. Pass Lanjutan — Prioritas B (OSINT Intelligence) SELESAI

OSINT Domain Intelligence sekarang **diimplementasikan penuh**, bukan lagi
placeholder:

- `app/services/osint_dns_service.py` — validasi format domain (menolak URL,
  path, dan alamat IP mentah yang menyamar sebagai "domain"), resolusi
  A/AAAA/MX/NS/TXT. **Enforcement anti-SSRF**: setiap IP hasil resolusi
  diklasifikasi lewat `classify_ip` yang sama dengan IP Intelligence — kalau
  SATU SAJA IP non-publik (private/loopback/link-local/multicast/reserved,
  termasuk `169.254.169.254` metadata cloud), **seluruh lookup domain
  ditolak** (status `blocked`), bukan cuma IP itu yang disaring.
- `app/services/osint_tls_service.py` — fetch sertifikat TLS publik. Koneksi
  socket dibuat ke **alamat IP yang sudah divalidasi**, bukan hostname yang
  di-resolve ulang saat connect — ini mencegah celah DNS-rebinding klasik
  (resolve aman → lolos validasi → re-resolve saat connect → ternyata sudah
  diarahkan ke IP privat).
- Disimpan ke tabel `osint_lookups` dengan history + pagination (`GET
  /api/v1/osint/history`), audit log otomatis untuk lookup yang diblokir
  maupun yang berhasil.
- Terhubung ke frontend di halaman **Attack Surface** (bukan halaman baru —
  dipakai ulang karena secara konsep memang untuk itu).
- 21 test baru (`test_osint_dns_safety.py`, `test_osint_tls_service.py`,
  `test_osint_api.py`), semuanya mock (tidak butuh internet saat test),
  termasuk kasus: domain resolve ke 127.0.0.1/10.x/169.254.169.254 → ditolak;
  domain campuran (1 IP publik + 1 privat) → tetap ditolak seluruhnya; TLS
  fetch terbukti connect ke IP yang divalidasi, bukan hostname mentah.
- **Bug ditemukan & diperbaiki dari testnya sendiri**: regex validasi domain
  awalnya meloloskan string seperti `8.8.8.8` sebagai "domain valid" (karena
  label numerik murni secara teknis cocok pola hostname) — ditambahkan
  pengecekan eksplisit via `ipaddress.ip_address()` untuk menolak input yang
  sebetulnya alamat IP, bukan domain.

Tidak butuh API key eksternal — pakai resolver DNS sistem (`dnspython`) dan
`ssl`/`socket` stdlib. Terdaftar di registry sebagai `osint_domain`,
`implemented: true`, `configured: true`.

## 5c. Pass Lanjutan — Prioritas C (GitHub Exposure Monitor) SELESAI

GitHub Exposure Monitor sekarang **diimplementasikan penuh**:

- `app/services/secret_patterns.py` — 7 pola kredensial umum (AWS key, GitHub
  PAT, Slack token, private key header, Google API key, Stripe key, generic
  API key assignment). Satu kecocokan per pola per file (cegah spam finding).
- `app/services/github_api_client.py` — klien tipis ke GitHub REST API
  (default branch, Git Trees API untuk daftar file, Contents API untuk isi
  file), timeout wajib di semua call, token hanya dipakai di header request.
- `app/services/github_exposure_service.py` — orkestrasi dengan **allowlist
  wajib** (`GITHUB_EXPOSURE_ALLOWED_REPOS`): repo yang tidak ada di daftar
  DITOLAK meski token punya akses lebih luas (defense-in-depth, bukan cuma
  andalkan scope token GitHub). File dibatasi jumlah & ukuran per scan.
- **Redaksi**: nilai kredensial yang match TIDAK PERNAH disimpan utuh — lewat
  `redact_secret()` (fungsi yang sudah disiapkan sejak Tahap 2 awal) sebelum
  masuk ke tabel `findings` sebagai `category=secret_exposure`.
- **Token tidak pernah bocor**: tidak masuk ke Finding, AuditLog, atau respons
  API manapun — dibuktikan oleh
  `test_audit_log_never_contains_github_token`.
- Status provider jujur: `not_configured` (token kosong) / `rejected_scope`
  (repo di luar allowlist) / `error` (gagal panggil API) / `completed`.
- Terhubung ke frontend di halaman **Vulnerability Management** (form "Scan
  Repo" di atas tabel findings — hasil scan langsung muncul di tabel yang
  sama).
- 19 test baru (`test_secret_patterns.py`, `test_github_exposure_service.py`),
  semua mock `GithubApiClient` — tidak butuh token/internet asli saat test.

Terdaftar di registry sebagai `github_exposure`, `implemented: true`. Tetap
`configured: false` sampai `GITHUB_TOKEN` dan `GITHUB_EXPOSURE_ALLOWED_REPOS`
diisi sendiri di `.env`.

## 6. Yang BELUM Diimplementasikan (jangan dianggap selesai)

- **Eksekusi Nmap nyata dari Red Team UI**: adapter terdaftar tapi endpoint
  eksekusi dengan scope allowlist belum disambungkan ke frontend pada pass ini.
- **Autentikasi & role/permission**: belum ada sama sekali.
- **ZAP, Wazuh, Suricata, Sigma, osquery, Greenbone**: masih sebatas entri
  registry (`implemented: true` untuk kerangka kelasnya, tapi semuanya
  `configured: false` tanpa env var asli — tidak ada yang benar-benar
  terhubung ke instance tool sungguhan).

## 7. Hasil Pengujian yang Benar-Benar Dijalankan (bukan klaim)

**Backend — `python -m pytest -q`:**
```
72 passed, 61 warnings in 0.47s
```
Rincian: test_health (1), test_assets (2), test_integrations_registry (3),
test_ip_classification + test_ip_intelligence_api + test_redaction (16),
test_findings (6), test_incidents (4), test_audit_logs (2),
test_osint_dns_safety (11), test_osint_tls_service (2), test_osint_api (7),
**test_secret_patterns (5, baru)**, **test_github_exposure_service (13, baru)**.

**Frontend — `npm run build`:**
```
✓ 1587 modules transformed
✓ built in 3.57s
```
TypeScript check (`tsc -b`) dan production build Vite lolos tanpa error.

**NOT RUN:** `npm run lint` (tidak ada script lint di `package.json`, tidak
ditambahkan pada pass ini agar tidak mengubah konfigurasi di luar scope),
pengujian integrasi dengan internet nyata untuk OSINT/GitHub (belum
diimplementasikan), pengujian Docker Compose end-to-end (Docker tidak
tersedia di lingkungan kerja sesi ini — hanya diperiksa sintaksnya manual).

## 8. Konfigurasi yang Harus Diisi Sendiri

Lihat `backend/.env.example`. Ringkasan:
- `SECRET_KEY` — wajib sebelum production, kosong secara default.
- `DEMO_PROVIDER_ENABLED` — set `true` untuk mengaktifkan provider IP demo
  (hasilnya tetap berlabel `[DATA DEMO]`, bukan reputasi nyata).
- `NMAP_BINARY`, `OWASP_ZAP_URL`/`API_KEY`, `WAZUH_API_URL`/`USER`/`PASSWORD` —
  integrasi tahap berikutnya, aman dikosongkan untuk development.
- `GITHUB_TOKEN`, `GITHUB_EXPOSURE_ALLOWED_REPOS`, `OSINT_DNS_TIMEOUT_SECONDS` —
  **hanya dokumentasi rencana**, belum dibaca kode manapun karena adapternya
  belum ada.
- `DOMAIN_NAME`, `VPS_*` — diisi sendiri saat tahap deployment VPS, tidak
  dibutuhkan untuk development lokal.

Tidak ada file `.env` asli yang masuk ke proyek ini — hanya `.env.example`
dengan placeholder kosong.

## 9. Batasan Keamanan Saat Ini

- Tidak ada autentikasi — **jangan expose ke jaringan publik**.
- `/api/v1/integrations`, `/api/v1/findings`, dll. bisa diakses siapa pun
  yang punya akses ke backend lokal.
- Audit log sengaja tidak pernah mencatat header Authorization/token (lihat
  `test_audit_logs.py::test_audit_log_does_not_leak_secrets`).
- SQLite di Docker Compose memakai named volume (`garda_cyber_db`) — tidak
  hilang saat container dibuat ulang, tapi tetap backup manual untuk data penting.

## 10c. Update: Prioritas C (GitHub Exposure Monitor) juga sudah selesai

Jadi dari 5 prioritas yang diminta di brief Tahap 2 (A/B/C/D/E), yang sudah
**diselesaikan penuh dan diuji**: A (IP Intelligence), B (OSINT), C (GitHub
Exposure Monitor), D (Findings & Incident), dan sebagian E (registry). Yang
masih di luar scope semua pass sejauh ini: Nmap live-scan dari UI, autentikasi,
Job Manager/Execution Engine, OT/ICS simulation — lihat bagian 6 di atas.

## 10b. Soal Permintaan "Maximum Implementation Mode"

Brief terakhir meminta pengembangan menyeluruh: Red Team Tool Library, Job
Manager, Execution Engine, OT/ICS Lab Simulation, autentikasi penuh,
dsb. — sekaligus dalam satu pass, tanpa batas ukuran kode.

Secara jujur: **itu tidak realistis diselesaikan dengan kualitas yang
diminta ("jangan disederhanakan, jangan mockup, harus teruji") dalam satu
sesi kerja.** Tiap item di daftar itu (mis. Execution Engine yang aman untuk
menjalankan tool ofensif, atau simulasi OT/ICS) sendirian adalah pekerjaan
berhari-hari kalau mau benar-benar aman dan teruji — menulisnya tergesa demi
"selesai semua" justru melanggar instruksi butir A di brief yang sama
("jangan mengganti fitur nyata dengan mockup/simulasi palsu").

Pendekatan yang dipakai sejak awal project ini (dan dipertahankan di pass
ini): **satu vertical slice solid per pass, diuji, didokumentasikan jujur,
baru lanjut ke berikutnya.** OSINT Intelligence selesai penuh di pass ini.
Sisa item dari daftar "maximum mode" — Job Manager, Execution Engine,
GitHub Exposure Monitor, OT/ICS Simulation, autentikasi — belum dikerjakan
dan BELUM boleh dianggap ada, walau namanya mungkin disebut di tempat lain.

## 10. Deployment (persiapan saja, tidak dijalankan)

Lihat `deployment/README.md` untuk port, reverse proxy, dan catatan HTTPS.
`docker-compose.yml` tidak membuka port ke publik dan tidak menjalankan apa
pun ke VPS — hanya untuk build & run lokal via `docker compose up`.

## Merge tools & Job Manager
Paket gabungan mempertahankan OSINT DNS/TLS dan GitHub Exposure, serta menambahkan Job Manager dengan adapter Nmap, Nuclei, dan Amass. Lihat `docs/MERGE_REPORT.md` dan `docs/OWNER_SETUP_CHECKLIST.md` untuk rincian status, dependensi, dan cara menjalankan. Status integrasi harus dicek di `/api/v1/integrations`; keberadaan kode adapter tidak berarti binary eksternal sudah terpasang.

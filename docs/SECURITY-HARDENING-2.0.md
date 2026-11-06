# Hardening setelah merge GARDA CYBER 2.0

Tanggal: 2026-11-06. Branch: `draft/garda2-merge`.

Merge `feat/live-globe` dari fork kawan membawa redesign 2.0 (dashboard live,
UI kit, hooks, platform layer). Yang **dipertahankan apa adanya**: seluruh
frontend 2.0, docs 2.0, `openapi.json`, dan model `security_logs` versi ringkas.

Beberapa bagian sengaja **dicabut atau diubah** karena bukan fungsi platform dan
berisiko kalau ikut di-PR. Semua masih bisa diambil kembali dari branch asli
(`kawan/feat/live-globe`, commit `cb2ffe8`) kalau memang diputuskan lain.

## Yang dicabut

| Item | Alasan |
|---|---|
| `backend/app/index.html` | Halaman berjudul *"Secure Login - GARDA CYBER"* yang mengirim email + password + koordinat GPS ke server. Mengumpulkan kredensial pengguna bukan fungsi platform ini. |
| `POST /api/v1/gps` (+ `GPSData`) | Menyimpan `password` plaintext ke database lalu meneruskannya ke webhook pihak ketiga. |
| `GET /lokasi` | Menyajikan `index.html` di atas. |
| `backend/app/admin.html` + `GET /admin` | Gerbang admin dengan kredensial hardcoded di dalam JavaScript (bisa dibaca siapa pun yang membuka halaman) dan bisa dilewati dari browser. |
| `GET /` versi tracking | Mencatat IP + geolokasi setiap pengunjung (ipify + ip-api.com) lalu mengirimnya ke webhook `*.trycloudflare.com`. Sekarang hanya mengembalikan info layanan. |
| Dua URL webhook n8n | Tunnel quick-trycloudflare milik pribadi; mati dalam hitungan jam dan bukan infrastruktur repo ini. |
| Service `n8n` di `deployment/docker-compose.yml` | Sama seperti di atas; kalau butuh automation, daftarkan service sendiri dengan URL milik sendiri. |
| Kolom `email`, `password`, `latitude`, `longitude` di `security_logs` | Ikut hilang bersama endpoint yang mengisinya. Panel Blue Team kini hanya menampilkan metadata akses (IP, kota, ISP, waktu). |

## Yang diperbaiki

- `allow_origins=["*"]` + `allow_credentials=True` → `allow_origins=settings.cors_origins_list`
  (dari `FRONTEND_ORIGIN`, default `http://localhost:5173`) + `allow_credentials=False`.
  Wildcard CORS membuat halaman mana pun bisa memanggil API ini dari browser pengguna.
- Static files memakai path absolut (`Path(__file__)`), tidak lagi bergantung CWD.
- `frontend/src/pages/BlueTeam.tsx` disesuaikan: kolom Credential dan kartu
  "GPS Login Alerts" dihapus, diganti "Unique Cities".

## Batas yang tersisa (jujur)

- `backend/app/dist/` dan `frontend/dist/` masih berisi build **sebelum** perubahan
  ini. Dashboard yang disajikan FastAPI (`/static/index.html`) belum memuat
  perbaikan BlueTeam di atas sampai frontend di-build ulang
  (`cd frontend && npm install && npm run build`, lalu salin `dist/` ke
  `backend/app/dist/`).
- Platform ini **tidak punya autentikasi**. Jangan taruh di alamat publik tanpa
  reverse proxy + auth di depannya.

## Cara mengambil kembali bagian yang dicabut

```bash
git show kawan/feat/live-globe:backend/app/index.html > backend/app/index.html
git show kawan/feat/live-globe:backend/app/main.py   # rujukan endpoint asli
```

---

## Ronde 2 (v0.2.0): API key, access log, versi terlihat

### API key (opsional, tapi wajib kalau port terbuka)

`API_KEY` di `backend/.env`. Kalau diisi:

- semua `/api/v1/*` wajib mengirim header `X-API-Key` dengan nilai sama;
- yang dikecualikan: `/api/v1/health`, `/api/v1/ready`, `/docs`, `/openapi.json`, dan aset statis
  (supaya pemantau/load balancer tidak ikut terkunci).
- kosong = tanpa auth, hanya untuk pemakaian lokal.

Frontend: kolom isian di **Settings → API Key**, nilainya disimpan di localStorage browser
dan dikirim sebagai `X-API-Key` oleh `lib/apiClient.ts`. Balasan 401 memunculkan pesan
"isi di halaman Settings", bukan pesan mentah dari backend.

Alasan: `POST /api/v1/jobs` bisa menjalankan `kartika_load` / `kartika_sqli_probe` ke target
apa pun yang terdaftar. Tanpa penjagaan, siapa pun yang menjangkau port itu bisa memakainya.

### Access log untuk Blue Team

Sebelumnya `/blue-team` akan selalu kosong: satu-satunya penulis tabel `security_logs`
adalah endpoint panen kredensial yang sudah dicabut. Sekarang ada middleware yang mencatat
**metode, path, kode status, IP, waktu** setiap permintaan `/api/*`.

Yang **sengaja tidak** dicatat: body request, cookie, header otorisasi, email, password.
Tabel dipangkas otomatis ke `ACCESS_LOG_MAX_ROWS` (default 500) baris terbaru.

Halaman Blue Team: badge kode status (hijau 2xx, kuning 4xx, merah 5xx), kartu
"Respons 4xx/5xx", dan keterangan bahwa ini log akses server, bukan data pengguna.

### Versioning

- `__APP_VERSION__` disuntik dari `frontend/package.json` lewat `define` di `vite.config.ts`,
  jadi angka di sidebar dan halaman Settings tidak bisa melenceng dari package.json.
- `package.json` + `package-lock.json` = **0.2.0**, git tag **v0.2.0**.
- Dependensi baru: `@types/node` (dev) — `vite.config.ts` memakai `path`/`__dirname`
  yang sebelumnya lolos hanya karena cache incremental `tsc -b`.

### Docker Compose

`env_file` sekarang memakai bentuk panjang `required: false` (Compose ≥ 2.24), sehingga
`docker compose up` tetap jalan walau `backend/.env` belum dibuat.

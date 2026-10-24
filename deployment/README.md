# Catatan Deployment — GARDA CYBER

Dokumen ini hanya DOKUMENTASI. Tidak ada deployment otomatis yang dijalankan,
dan tidak ada VPS/domain/credential yang diminta di sini.

## Port yang dibutuhkan
| Layanan  | Port lokal | Keterangan |
|----------|-----------|------------|
| Backend  | 8000      | FastAPI (uvicorn) |
| Frontend | 5173 (dev) / 80 (container) | Vite dev server / Nginx static |

## Database
SQLite harus disimpan di **volume Docker bernama (named volume)**, bukan di
filesystem sementara container, supaya data tidak hilang saat container
dibuat ulang. Contoh sudah disiapkan di `docker-compose.yml`
(`garda_cyber_db:/app/data`). Untuk beban produksi lebih besar, migrasi ke
PostgreSQL disarankan — ganti `DATABASE_URL` di `.env`.

## Reverse proxy & HTTPS (untuk production, dikerjakan Anda sendiri)
Saat Anda siap deploy ke VPS:
1. Gunakan reverse proxy (mis. Caddy atau Nginx) di depan `backend:8000` dan
   `frontend:80`.
2. Terbitkan TLS/HTTPS lewat reverse proxy tersebut (mis. Caddy otomatis via
   Let's Encrypt, atau certbot untuk Nginx).
3. Set `FRONTEND_ORIGIN` di `.env` backend ke domain HTTPS final Anda (untuk
   CORS), dan `VITE_API_BASE_URL` di `.env` frontend ke URL API publik Anda.
4. Isi `DOMAIN_NAME`, `SECRET_KEY`, dan kredensial lain langsung di server
   Anda sendiri — JANGAN pernah mengirim nilai-nilai ini ke percakapan AI
   mana pun.

## Yang BELUM aman untuk production
- Belum ada autentikasi/otorisasi nyata (direncanakan Tahap 5).
- `SECRET_KEY` masih kosong di `.env.example` — wajib diisi nilai acak yang
  kuat sebelum production.
- CORS saat ini hanya mengizinkan satu origin dari `.env` — sesuaikan untuk
  kebutuhan Anda.

Jangan menganggap konfigurasi ini aman untuk production sebelum butir-butir
di atas diselesaikan dan diverifikasi.

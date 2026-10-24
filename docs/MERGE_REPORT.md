# GARDA CYBER — Merge Report

## Basis penggabungan
- `GARDA-CYBER-Phase2-Full.zip`: basis utama untuk mempertahankan OSINT DNS/TLS, GitHub Exposure Monitor, model data, API, dan frontend.
- `GARDA-CYBER-Tahap3.zip`: sumber Job Manager, model/schema/repository job, endpoint pekerjaan, dan adapter Nmap yang mengeksekusi binary secara nyata.

## Yang digabungkan
- Job Manager: `POST /api/v1/jobs`, `GET /api/v1/jobs`, `GET /api/v1/jobs/{job_id}`, `POST /api/v1/jobs/{job_id}/cancel`.
- Nmap adapter yang memeriksa binary, menggunakan `subprocess.run(..., shell=False)`, membatasi flag, dan mensyaratkan target berupa aset aktif di Asset Inventory.
- Nuclei adapter untuk pemindaian kerentanan terhadap aset terdaftar. Argumen eksekusi ditentukan di adapter, bukan dari input command mentah.
- Amass adapter dalam mode enumerasi pasif untuk aset domain terdaftar.
- Frontend Red Team dengan status integrasi, pemilihan aset, eksekusi job, dan riwayat job.
- OSINT DNS/TLS dan GitHub Exposure dari Phase2-Full tetap dipertahankan.

## Status yang perlu dipahami
- Kode adapter Nmap, Nuclei, dan Amass tersedia. Tool hanya dapat dieksekusi jika binary yang dibutuhkan benar-benar terpasang dan konfigurasi yang diperlukan terpenuhi.
- OWASP ZAP dan Greenbone tetap terdaftar, tetapi eksekusi end-to-end melalui Job Manager belum tersedia pada paket ini.
- Job Manager saat ini menjalankan pekerjaan secara sinkron di proses API; pekerjaan yang lama dapat menahan request sampai selesai atau timeout.
- Backend test: `72 passed` dalam lingkungan pengembangan ini.
- Frontend build belum dapat diverifikasi karena dependensi TypeScript di lingkungan build tidak lengkap (tipe React/Babel/Estree tidak ditemukan). Jalankan `npm ci` dengan koneksi paket yang berfungsi lalu `npm run build` di mesin pengguna.
- Tools eksternal tidak terpasang atau diuji live di lingkungan ini. Periksa `/api/v1/integrations` untuk status aktual.

## Pengaturan lokal
1. Backend: salin `backend/.env.example` menjadi `backend/.env` dan sesuaikan variabel yang diperlukan.
2. Nmap: isi `NMAP_BINARY` dengan path executable Nmap, lalu pastikan binary tersedia.
3. Nuclei dan Amass: instal binary resmi dan pastikan dapat dipanggil dari PATH backend.
4. Frontend: salin `frontend/.env.example` menjadi `frontend/.env.local`, lalu set `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
5. Daftarkan aset yang memang diizinkan pada Asset Inventory dan ubah statusnya menjadi `active` sebelum menjalankan job.
6. Jangan gunakan target yang tidak berada dalam lingkup izin. Jangan masukkan token atau secret ke source code atau log.

## Cara menjalankan
Backend dari direktori `backend`:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Frontend dari direktori `frontend`:

```bash
npm ci
npm run dev
```

Dokumentasi API tersedia pada `http://localhost:8000/docs` ketika backend aktif.

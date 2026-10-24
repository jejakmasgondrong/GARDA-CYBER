# Owner Setup Checklist — GARDA CYBER

Dokumen ini berisi semua yang **harus kamu kerjakan sendiri** di luar kode.
Tidak ada API key, password, atau token yang diminta atau diisi oleh AI
di proyek ini — semua kamu isi sendiri secara lokal di file `.env`.

Legenda: 🔴 **Wajib** (aplikasi tidak jalan tanpanya) · 🟡 **Opsional**
(fitur tertentu saja) · ⚪ **Hanya untuk fitur spesifik**

---

## 1. Perangkat Keras & Software Dasar 🔴

| Kebutuhan | Versi minimum | Cek dengan |
|---|---|---|
| Python | 3.11+ | `python --version` |
| Node.js + npm | 20+ | `node --version` |
| Git | terbaru | `git --version` |

## 2. Backend — Instalasi 🔴

```powershell
cd GARDA-CYBER\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Verifikasi: buka `http://127.0.0.1:8000/api/v1/health` → harus muncul
`{"status":"ok",...}`.

## 3. Frontend — Instalasi 🔴

```powershell
cd GARDA-CYBER\frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Verifikasi: buka `http://localhost:5173` → sidebar GARDA CYBER muncul.

## 4. Tools yang Perlu Diinstal Sendiri 🟡

**Catatan penting:** kode ini dikembangkan di lingkungan tanpa akses
internet, sehingga **tidak ada tool di bawah ini yang berhasil diinstal
atau diuji nyata oleh AI**. Semua adapter sudah siap dari sisi kode —
status `installed` akan otomatis menjadi `true` begitu binary-nya ada di
PATH sistemmu.

| Tool | Cara instal (Windows) | Cara verifikasi | Dipakai untuk |
|---|---|---|---|
| **Nmap** 🟡 | Download dari nmap.org/download.html, centang "Add to PATH" saat instal | `nmap --version` di PowerShell | Network & service discovery (Red Team) |
| **OWASP ZAP** ⚪ | Download dari zaproxy.org, jalankan daemon mode | Cek `http://localhost:8080` aktif | Web app security testing |
| **Nuclei** ⚪ | `go install` atau download binary dari GitHub nuclei releases | `nuclei -version` | Vulnerability templates |
| **Docker Desktop** ⚪ | docker.com/products/docker-desktop | `docker --version` | Menjalankan Wazuh/Greenbone/Conpot sebagai container |

Setelah tool terpasang, cek statusnya otomatis lewat:
```
GET http://127.0.0.1:8000/api/v1/integrations
```
Field `installed` akan `true`/`false` sesuai kondisi sebenarnya di
sistemmu (bukan asumsi kode).

## 5. Mengisi `.env` Backend 🔴/🟡

Salin dari `backend/.env.example`:

| Variabel | Wajib? | Cara isi |
|---|---|---|
| `DATABASE_URL`, `FRONTEND_ORIGIN` | 🔴 tapi default sudah jalan | Biarkan default untuk lokal |
| `SECRET_KEY` | 🔴 sebelum production | Generate string acak panjang, mis. `python -c "import secrets; print(secrets.token_hex(32))"` |
| `NMAP_BINARY` | 🟡 | Path ke `nmap.exe`, mis. `C:\Program Files (x86)\Nmap\nmap.exe` |
| `OWASP_ZAP_URL`, `OWASP_ZAP_API_KEY` | ⚪ | URL daemon ZAP lokal + API key dari ZAP Options → API |
| `WAZUH_API_URL/USER/PASSWORD` | ⚪ | Dari instance Wazuh yang kamu deploy sendiri (biasanya via Docker) |

## 6. Mendapatkan GitHub Token (untuk GitHub Exposure Monitor) ⚪

1. Buka github.com → Settings → Developer settings → **Fine-grained tokens**
2. Buat token baru, **batasi hanya ke repository yang memang milik
   satuan/tim kalian** (jangan pilih "All repositories")
3. Izin minimum yang dibutuhkan: **Contents: Read-only**,
   **Metadata: Read-only**. Jangan beri izin write/admin.
4. Simpan token, isi ke `.env` backend sebagai `GITHUB_TOKEN` (cek nama
   variabel pasti di `backend/.env.example` setelah adapter GitHub
   selesai dikonfigurasi)
5. **Jangan pernah commit token ke Git** — `.gitignore` sudah menolak
   file `.env`, tapi tetap periksa sebelum push

## 7. Cara Menguji Koneksi Tiap Integrasi

Semua integrasi punya endpoint status yang sama:
```
GET /api/v1/integrations
```
Baca field per tool:
- `implemented: false` → kodenya belum ditulis, bukan masalah instalasi
- `installed: false` → binary/dependency tidak ditemukan di sistem ini
- `configured: false` → `.env` belum diisi lengkap
- `executable: true` → ketiga syarat di atas terpenuhi, **siap dipakai lewat Job Manager**

Untuk Nmap spesifik, setelah `executable: true`, uji lewat:
```
POST /api/v1/jobs
{ "tool_id": "nmap", "asset_id": "<id aset yang sudah berstatus active>", "parameters": {"flags": ["-sV"]} }
```
Lihat `status` pada respons: `completed` = benar-benar berjalan,
`failed` = ada `failure_reason` yang menjelaskan kenapa.

## 8. Troubleshooting Umum

| Gejala | Kemungkinan penyebab |
|---|---|
| Frontend tidak bisa fetch data, CORS error di console | `FRONTEND_ORIGIN` di backend `.env` tidak cocok dengan URL frontend |
| `installed: false` padahal sudah install tool | Tool belum ada di PATH sistem — restart terminal/PowerShell setelah instal |
| Job selalu `failed` dengan alasan "tool belum terpasang" | Normal jika tool memang belum diinstal — ini bukan bug, ini `is_installed()` yang jujur |
| `pytest` gagal karena `pydantic_core` tidak ketemu | venv dibuat di OS berbeda dari yang dipakai menjalankan tes — buat ulang venv di OS yang sama |

## 9. Deployment Production (baca dulu sebelum online)

Lihat `deployment/README.md` untuk port, reverse proxy, dan HTTPS.
**Jangan deploy ke internet publik** sebelum:
- `SECRET_KEY` diisi nilai acak kuat
- Autentikasi (Tahap 5) diimplementasikan
- Semua endpoint aktif (termasuk `/jobs`) dilindungi otorisasi

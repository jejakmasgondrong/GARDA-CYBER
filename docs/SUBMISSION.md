# Checklist Submission — Kartika Cyber Hackathon 2026

Deadline: **15 November 2026, 23:59 WIB** (dari rulebook).

## Data karya (asumsi — konfirmasi di formulir)

| Kolom | Isi |
|---|---|
| Nama karya | GARDA-CYBER |
| Kategori | Dukungan Teknologi (platform operasi keamanan siber modular) |
| Link karya | https://github.com/jejakmasgondrong/GARDA-CYBER (repo **PUBLIC**) |

Catatan: formulir platform tidak menampilkan pilihan kategori Penindakan/
Penangkalan/Dukungan Teknologi/Siber Sosial saat pendaftaran, sehingga
kategori di atas adalah penetapan sendiri berdasarkan sifat karya. Sesuaikan
di formulir kalau ternyata kategorinya berbeda.

## Kelengkapan wajib (5)

| # | Item | Status | File |
|---|---|---|---|
| 1 | Link karya publik | ✅ repo publik, link download | https://github.com/jejakmasgondrong/GARDA-CYBER |
| 2 | Thumbnail 1200×630, JPG/PNG/WebP, ≤500KB | ✅ PNG 1200×630, 34KB | `submission/thumbnail.png` |
| 3 | Screenshot, maks 5 gambar | ✅ 5 gambar 1440×900 | `submission/01-dashboard.png` … `05-findings.png` |
| 4 | Video YouTube ≤10 menit | ⏭️ bukan bagian kita (tim lain) | — |
| 5 | Slide penjelasan | ✅ PPTX 11 slide | `submission/GARDA-CYBER-slide-penjelasan.pptx` |

Tidak ada .exe: rulebook tidak mewajibkan executable; link download repo +
Docker Compose sudah memenuhi syarat link karya. Juri di Windows tanpa Docker
bisa pakai `setup.bat` (double-click) — instal dependensi + jalankan backend
+ frontend otomatis. Di Linux/macOS tinggal `bash setup.sh` (perilaku sama,
port bisa diubah: `bash setup.sh 8001 5174`).

## Urutan upload di platform

1. Buka formulir submission, masukkan nama karya + kategori (tabel di atas).
2. Link karya: isi URL repo publik di atas.
3. Thumbnail: unggah `submission/thumbnail.png`.
4. Screenshot: unggah 5 file `submission/01-dashboard.png` sampai
   `submission/05-findings.png`.
5. Video: kosongkan/abai — ditangani tim lain.
6. Slide: unggah `submission/GARDA-CYBER-slide-penjelasan.pptx`.

## Cara demo (kalau diminta presentasi)

Lihat `docs/DRAFT-KARTIKA-LOAD.md` bagian demo 3 menit. Prasyarat:
backend jalan di `http://127.0.0.1:8010`, frontend di `http://127.0.0.1:5173`,
seed demo sudah dijalankan (`backend/scripts/seed_demo.py`).

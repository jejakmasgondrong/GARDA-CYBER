# Tambahan UI/UX di branch `draft/garda2-merge`

Tanggal: 2026-11-06. Semua diagram di bawah membaca **data API sungguhan**;
kalau datanya nol, kartu menampilkan keadaan kosong, bukan angka contoh.

## 1. Diagram baru

| Halaman | Diagram | Isi |
|---|---|---|
| Findings | Donut tingkat keyakinan | high / medium / low |
| Findings | Bar per kategori | OSINT, Secret Exposure, IP Reputation, Lainnya |
| Findings | Bar status penanganan | Open / Triaged / Remediated / False Positive |
| Incident Mgmt | Donut status insiden | Open / Investigating / Contained / Closed |
| Incident Mgmt | Bar usia insiden terbuka | < 1 hari, 1–3, 3–7, > 7 hari |
| Job Manager | Donut status job | Antre / Berjalan / Selesai / Gagal / Dibatalkan |
| Job Manager | Bar durasi rata-rata per tool | Satuan otomatis (ms untuk tool cepat, detik untuk job panjang) |
| Asset Inventory | Bar aset per tipe | Domain / IP / Aplikasi / Perangkat / Lainnya |
| Asset Inventory | Donut status aset | Aktif / Nonaktif / Perlu Tinjauan |
| Reports | Bar temuan per kategori | Isi Vulnerability Report |

Selain itu:

- Dashboard: kolom keterangan di samping globe (job berjalan, target tanpa lokasi,
  status backend, daftar target, legenda titik).
- Topologi: legenda "Aset nonaktif" ditambahkan.
- Kartu diagram kosong sekarang memakai bingkai berpetak dengan keterangan —
  terlihat sebagai "area diagram yang belum ada isinya", bukan kartu rusak.
- Semua diagram memakai palet bersama di `src/lib/chartTheme.ts`.
- Animasi masuk diagram dimatikan: dashboard ini menyegarkan data tiap beberapa
  detik, animasi masuk hanya membuat grafik terlihat "bergerak sendiri".

## 2. Halaman Reports sekarang berfungsi

Sebelumnya 5 kartu dengan tombol export **disabled** dan tidak ada endpoint
backend. Sekarang tombol "Unduh" menyusun laporan Markdown di browser dari data
API saat ditekan (aset, temuan, insiden, job), lalu mengunduhnya sebagai
`garda-<jenis>-<tanggal>.md`.

Batas yang ditulis di halaman: laporan berisi apa adanya dari API — tidak
menghitung skor risiko, tidak menyimpulkan ada/tidaknya kompromi.

Kalau nanti backend punya endpoint export, fungsi `buildReport()` tinggal diganti
pemanggilan endpoint.

## 3. Data demo lokal (untuk QA tampilan)

UI tidak boleh menampilkan angka karangan, jadi untuk melihat diagram berisi
dipakai script seed yang menulis lewat endpoint POST yang sama dengan manusia:

```bash
python backend/scripts/seed_demo.py --base http://127.0.0.1:8000
python backend/scripts/seed_demo.py --base http://127.0.0.1:8000 --dry-run
python backend/scripts/seed_demo.py --base http://127.0.0.1:8000 --skip-existing
```

Isi: 5 aset, 8 temuan, 4 insiden, 2 job `kartika_wa_phish` (analisis teks
offline — **tanpa** lalu lintas jaringan, tanpa load test). Semua baris diberi
awalan `[seed]`.

Catatan: API belum punya endpoint DELETE, jadi pembersihan dilakukan dengan
menghapus database sqlite lokal (lihat `DATABASE_URL`) atau lewat SQL.

## 4. Screenshot

Screenshot PC (1440×900) dan mobile (390×844) disimpan di `screenshots/`
(gitignored). Alatnya `py-lib/ui_screenshot.py` di repo gondrongopenAI — memakai
Chrome DevTools Protocol, karena `chrome --headless --screenshot` merekam
animasi di frame awal sehingga grafik tampak kosong.

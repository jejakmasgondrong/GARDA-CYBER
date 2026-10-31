# Referensi ofensif Kartika (non-aktif, untuk hackathon)

Status: **INVENTARIS REFERENSI SAJA — DISABLED**.
Tidak ada adapter eksekusi, tidak ada payload yang dieksekusi, tidak ada
pengiriman pesan crash ke pihak mana pun. File ini hanya mencatat daftar
tautan yang diminta Gondrong pada 2026-10-31 untuk ditinjau sebagai bahan
threat-intel / materi lab hackathon.

Gating yang diminta: kalau suatu saat ada yang mau diaktifkan dalam lab,
wajib lewat keputusan eksplisit + user admin TNI + aset lab sendiri (ACTIVE,
scope lab). Tanpa itu semua tetap non-aktif.

## Daftar (12 unik, 1 duplikat dibuang)

| # | Tautan | Klasifikasi defensif |
|---|---|---|
| 1 | https://github.com/hackerxphantom/wa_crasher | WA crasher / virtex (DoS teks) — referensi pola, bukan untuk dijalankan |
| 2 | https://github.com/sansekai/wa-virtex | WA virtex (DoS teks) — referensi pola |
| 3 | https://github.com/Ditt-NoLife/virtex-1 | WA virtex (DoS teks) — referensi pola (diberi 2x, dihitung 1x) |
| 4 | https://github.com/sigalor/whatsapp-web-reveng | Riset protokol WhatsApp Web — konteks teknis |
| 5 | https://www.exploit-db.com/exploits/45579 | Entri Exploit-DB — referensi kerentanan |
| 6 | https://github.com/segofensiva/WhatsAppRemoteCrash | Riset remote crash WhatsApp — referensi |
| 7 | https://projectzero.google/2018/12/adventures-in-video-conferencing-part-3.html | Riset Project Zero (video conferencing) — referensi |
| 8 | https://github.com/darrylburke/AndroidMalwareExample | Contoh edukasi malware Android — referensi pola |
| 9 | https://github.com/shekyan/slowhttptest | Tool uji ketahanan HTTP (lab-only) — sejalan dengan modul load |
| 10 | https://github.com/rapid7/metasploit-framework | Framework eksploitasi dual-use — hanya sebagai konteks tooling |
| 11 | https://github.com/AvishkaShavinda/PRINCE-AVI-MD | Bot/MD WhatsApp — konteks ekosistem, bukan crasher |
| 12 | https://github.com/dnuzi/X-Crasher-Wa | WA crasher — referensi pola (tautan asli diakhiri `/update`) |

Catatan UTM: parameter `?utm_source=...` dibuang dari pencatatan karena
hanya penanda trafik, bukan bagian identitas repo.

## Batas tegas

- Tidak ada kode dari tautan di atas yang di-vendor ke repo ini.
- Tidak ada adapter `tool_id` baru yang didaftarkan ke registry.
- Tidak ada eksekusi, tidak ada pengiriman payload, tidak ada target di luar
  aset lab sendiri.
- Kalau ada kebutuhan deteksi (mis. pola virtex untuk `kartika_wa_phish`),
  itu dikerjakan sebagai aturan deteksi offline terpisah, bukan sebagai
  fungsi crash.

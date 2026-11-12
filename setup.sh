#!/usr/bin/env bash
# GARDA-CYBER - Setup Satu Klik (Linux / macOS)
# Pasangan setup.bat (Windows). Di Linux/macOS tidak ada double-click,
# jadi jalankan dari terminal di folder root repo:
#
#   bash setup.sh
#
# Yang dilakukan:
#   1. Cek Python 3.11+ dan Node.js 20+ ada di PATH.
#   2. Buat virtual environment backend (kalau belum ada).
#   3. Instal dependensi backend (requirements.txt) + frontend (npm install).
#   4. Salin .env contoh kalau belum ada (TIDAK menimpa .env yang sudah ada).
#   5. Jalankan backend + frontend di latar belakang, tunggu health check,
#      isi data demo otomatis (kalau database masih kosong), lalu buka browser
#      ke halaman depan.
#
# Port bisa diubah (berguna kalau port default sudah dipakai):
#   bash setup.sh [port_backend] [port_frontend]      # default 8000 5173
#
# Berhenti:
#   kill $(cat /tmp/garda-cyber-backend.pid) $(cat /tmp/garda-cyber-frontend.pid)
#   atau: pkill -f "uvicorn app.main:app" ; pkill -f vite
set -u

BACKEND_PORT="${1:-8000}"
FRONTEND_PORT="${2:-5173}"

LOG_BACKEND="/tmp/garda-cyber-backend.log"
LOG_FRONTEND="/tmp/garda-cyber-frontend.log"
PID_BACKEND="/tmp/garda-cyber-backend.pid"
PID_FRONTEND="/tmp/garda-cyber-frontend.pid"

cd "$(dirname "$0")" || exit 1

gagal() {
  echo ""
  echo "[ERROR] $1"
  echo "        Baca pesan di atas, lalu jalankan ulang: bash setup.sh"
  exit 1
}

echo "============================================"
echo "  GARDA-CYBER - Setup Satu Klik (Linux/macOS)"
echo "============================================"
echo ""

# --- Cek Python ---
PYTHON=""
for kandidat in python3 python; do
  if command -v "$kandidat" >/dev/null 2>&1; then PYTHON="$kandidat"; break; fi
done
[ -n "$PYTHON" ] || gagal "Python tidak ditemukan di PATH. Instal Python 3.11+: https://www.python.org/downloads/"
"$PYTHON" --version || gagal "Python tidak bisa dijalankan."

# --- Cek Node ---
command -v node >/dev/null 2>&1 || gagal "Node.js tidak ditemukan di PATH. Instal Node.js 20+: https://nodejs.org/"
node --version

echo ""
echo "[1/4] Persiapan virtual environment backend..."
if [ ! -d backend/.venv ]; then
  "$PYTHON" -m venv backend/.venv || gagal "gagal membuat virtual environment di backend/.venv."
fi

echo "[2/4] Instal dependensi backend..."
backend/.venv/bin/python -m pip install --upgrade pip >/dev/null || gagal "gagal upgrade pip."
backend/.venv/bin/python -m pip install -r backend/requirements.txt || gagal "gagal instal backend/requirements.txt."

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
fi
echo "[INFO] backend/.env aktif (mode development, SECRET_KEY kosong = ok untuk lokal)."

echo "[3/4] Instal dependensi frontend (npm install, bisa beberapa menit)..."
( cd frontend && npm install ) || gagal "gagal npm install di frontend/."
if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
fi
# Pastikan URL backend di frontend cocok dengan port yang dipakai setup.sh.
# Baris VITE_API_BASE_URL localhost diperbarui otomatis; kalau sudah diarahkan
# ke domain lain (misal production), biarkan tapi peringatkan.
if grep -q '^VITE_API_BASE_URL=http://localhost:' frontend/.env.local; then
  env_tmp="$(mktemp)"
  awk -v url="VITE_API_BASE_URL=http://localhost:$BACKEND_PORT/api/v1" \
    '{ if ($0 ~ /^VITE_API_BASE_URL=/) print url; else print $0 }' \
    frontend/.env.local >"$env_tmp" && mv "$env_tmp" frontend/.env.local
  echo "[INFO] frontend/.env.local mengarah ke backend di port $BACKEND_PORT."
else
  echo "[WARN] frontend/.env.local punya VITE_API_BASE_URL non-localhost -- tidak diubah."
  echo "       Pastikan URL itu menunjuk ke backend di port $BACKEND_PORT."
fi

echo "[4/4] Menjalankan server..."

# Kalau PID lama masih hidup, matikan dulu agar port tidak bentrok.
for f in "$PID_BACKEND" "$PID_FRONTEND"; do
  if [ -f "$f" ] && kill -0 "$(cat "$f")" 2>/dev/null; then
    echo "[INFO] Server lama masih hidup (PID $(cat "$f")) -- dimatikan dulu."
    kill "$(cat "$f")" 2>/dev/null
    sleep 1
  fi
done

( cd backend && nohup .venv/bin/python -m uvicorn app.main:app --reload \
    --host 127.0.0.1 --port "$BACKEND_PORT" </dev/null >"$LOG_BACKEND" 2>&1 & echo $! >"$PID_BACKEND" )
( cd frontend && nohup npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" \
    </dev/null >"$LOG_FRONTEND" 2>&1 & echo $! >"$PID_FRONTEND" )

echo "Menunggu backend siap (maks 30 detik)..."
BACKEND_READY=0
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi
  sleep 1
done

if [ "$BACKEND_READY" -ne 1 ]; then
  echo ""
  echo "[ERROR] Backend tidak merespons di port $BACKEND_PORT. Log terakhir:"
  tail -n 15 "$LOG_BACKEND" 2>/dev/null
  echo ""
  echo "        Kemungkinan port $BACKEND_PORT sudah dipakai -- coba:"
  echo "          bash setup.sh 8001 5174"
  exit 1
fi

# Isi data demo otomatis (idempoten: --skip-existing lewati kalau database
# sudah terisi). Seed lewat HTTP endpoint yang sama dengan manusia, tanpa
# --with-osint (offline-safe). Kegagalan seed = peringatan, setup tetap jalan.
echo "[INFO] Mengisi data demo (kalau database masih kosong)..."
if ( cd backend && .venv/bin/python scripts/seed_demo.py \
      --base "http://127.0.0.1:$BACKEND_PORT" --skip-existing ); then
  :
else
  echo ""
  echo "[WARN] Data demo GAGAL diisi -- server tetap jalan, dashboard mungkin kosong."
  echo "       Coba lagi nanti: cd backend && .venv/bin/python scripts/seed_demo.py"
fi

# Buka browser ke halaman depan (xdg-open = Linux, open = macOS).
# Di mesin tanpa DISPLAY (headless/SSH) langkah ini dilewati -- URL tetap dicetak.
if [ -n "${DISPLAY:-}" ]; then
  if command -v xdg-open >/dev/null 2>&1; then
    timeout 5 xdg-open "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1 &
  fi
else
  echo "[INFO] Tidak ada DISPLAY (headless) -- buka URL di atas manual di browser."
fi

echo ""
echo "============================================"
echo "  Setup selesai. Server jalan di latar belakang:"
echo "   - Backend : http://localhost:$BACKEND_PORT  (dokumentasi: /docs)"
echo "   - Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "   Log    : $LOG_BACKEND  |  $LOG_FRONTEND"
echo "   PID    : $(cat "$PID_BACKEND") (backend)  |  $(cat "$PID_FRONTEND") (frontend)"
echo ""
echo "   Hentikan:"
echo "     kill \$(cat /tmp/garda-cyber-backend.pid) \$(cat /tmp/garda-cyber-frontend.pid)"
echo "============================================"

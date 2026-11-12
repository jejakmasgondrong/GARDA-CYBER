@echo off
title GARDA-CYBER - Setup Satu Klik (Windows)
cd /d "%~dp0"

echo ============================================
echo   GARDA-CYBER - Setup Satu Klik (Windows)
echo ============================================
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Python tidak ditemukan di PATH.
  echo         Instal Python 3.11+ dari https://www.python.org/downloads/
  echo         Centang "Add Python to PATH" saat instal, lalu jalankan ulang.
  echo.
  pause
  exit /b 1
)
python --version

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js tidak ditemukan di PATH.
  echo         Instal Node.js 20+ dari https://nodejs.org/, lalu jalankan ulang.
  echo.
  pause
  exit /b 1
)
node --version

echo.
echo [1/4] Persiapan virtual environment backend...
if not exist backend\.venv python -m venv backend\.venv

echo [2/4] Instal dependensi backend...
backend\.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto :gagal
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 goto :gagal

if not exist backend\.env copy backend\.env.example backend\.env >nul
echo [INFO] backend\.env aktif (mode development, SECRET_KEY kosong = ok untuk lokal).

echo [3/4] Instal dependensi frontend (npm install, bisa beberapa menit)...
cd frontend
call npm install
if errorlevel 1 goto :gagal
if not exist .env.local copy .env.example .env.local >nul
cd ..

echo [4/4] Menjalankan server...
start "GARDA-CYBER Backend" /d "%~dp0backend" cmd /k ".venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
start "GARDA-CYBER Frontend" /d "%~dp0frontend" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul

echo.
echo Mengisi data demo (kalau database masih kosong)...
backend\.venv\Scripts\python.exe scripts\seed_demo.py --base http://127.0.0.1:8000 --skip-existing
if errorlevel 1 echo [WARN] Data demo GAGAL diisi -- server tetap jalan, dashboard mungkin kosong.

echo.
echo Membuka http://localhost:5173 ...
start http://localhost:5173

echo.
echo ============================================
echo   Setup selesai. Dua jendela baru sudah terbuka:
echo    - Backend  : http://localhost:8000  (dokumentasi: /docs)
echo    - Frontend : http://localhost:5173
echo.
echo   Hentikan: tutup kedua jendela tadi.
echo ============================================
echo.
pause
exit /b 0

:gagal
echo.
echo [ERROR] Instalasi gagal. Baca pesan di atas, lalu jalankan ulang setup.bat.
pause
exit /b 1

@echo off
title GARDA-CYBER - Setup Satu Klik (Windows)
rem Port auto-pick: kalau default (8000/5173) sedang dipakai, setup naik
rem otomatis ke port berikutnya (8001/5174, dst) -- satu klik jalan semua
rem tanpa tubruk. Untuk port khusus, edit dua baris "set ..._PORT=" di bawah.
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

rem --- Pilih port bebas (auto naik kalau sibuk) ---
:backend_port
netstat -an | findstr /r ":!BACKEND_PORT! .*LISTENING" >nul
if not errorlevel 1 (
  set /a BACKEND_PORT+=1
  goto :backend_port
)
:frontend_port
netstat -an | findstr /r ":!FRONTEND_PORT! .*LISTENING" >nul
if not errorlevel 1 (
  set /a FRONTEND_PORT+=1
  goto :frontend_port
)
echo [INFO] Port terpilih: backend %BACKEND_PORT%, frontend %FRONTEND_PORT%.

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

rem Pastikan URL backend di frontend cocok dengan port yang dipakai setup.bat.
rem Baris VITE_API_BASE_URL localhost diperbarui otomatis; kalau sudah
rem diarahkan ke domain lain (misal production), biarkan tapi peringatkan.
findstr /b "VITE_API_BASE_URL=http://localhost:" frontend\.env.local >nul
if not errorlevel 1 (
  powershell -NoProfile -Command "(Get-Content frontend\.env.local) -replace 'VITE_API_BASE_URL=http://localhost:\d+/api/v1', 'VITE_API_BASE_URL=http://localhost:%BACKEND_PORT%/api/v1' | Set-Content frontend\.env.local"
  echo [INFO] frontend\.env.local mengarah ke backend di port %BACKEND_PORT%.
) else (
  echo [WARN] frontend\.env.local punya VITE_API_BASE_URL non-localhost -- tidak diubah.
  echo        Pastikan URL itu menunjuk ke backend di port %BACKEND_PORT%.
)

rem CORS: backend mengizinkan asal frontend lewat FRONTEND_ORIGIN. Baris
rem localhost diperbarui otomatis; kalau sudah diarahkan ke domain lain,
rem biarkan tapi peringatkan.
findstr /b "FRONTEND_ORIGIN=http://localhost:" backend\.env >nul
if not errorlevel 1 (
  powershell -NoProfile -Command "(Get-Content backend\.env) -replace 'FRONTEND_ORIGIN=http://localhost:\d+,http://127\.0\.0\.1:\d+', 'FRONTEND_ORIGIN=http://localhost:%FRONTEND_PORT%,http://127.0.0.1:%FRONTEND_PORT%' | Set-Content backend\.env"
  echo [INFO] backend\.env FRONTEND_ORIGIN mengizinkan frontend di port %FRONTEND_PORT%.
) else (
  echo [WARN] backend\.env punya FRONTEND_ORIGIN non-default -- tidak diubah.
  echo        Pastikan origin frontend (port %FRONTEND_PORT%) ada di dalamnya.
)

echo [4/4] Menjalankan server...
start "GARDA-CYBER Backend" /d "%~dp0backend" cmd /k ".venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%"
start "GARDA-CYBER Frontend" /d "%~dp0frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port %FRONTEND_PORT%"

echo Menunggu backend siap (maks 30 detik)...
set "READY=0"
for /L %%i in (1,1,30) do if !READY!==0 (
  curl -sf http://127.0.0.1:%BACKEND_PORT%/api/v1/health >nul 2>&1 && set "READY=1"
)
if !READY!==0 (
  echo.
  echo [ERROR] Backend tidak merespons di port %BACKEND_PORT%.
  echo         Buka jendela backend untuk membaca pesannya, lalu jalankan ulang setup.bat.
  pause
  exit /b 1
)

echo.
echo Mengisi data demo (kalau database masih kosong)...
backend\.venv\Scripts\python.exe scripts\seed_demo.py --base http://127.0.0.1:%BACKEND_PORT% --skip-existing
if errorlevel 1 echo [WARN] Data demo GAGAL diisi -- server tetap jalan, dashboard mungkin kosong.

echo.
echo Membuka http://localhost:%FRONTEND_PORT% ...
start http://localhost:%FRONTEND_PORT%

echo.
echo ============================================
echo   Setup selesai. Dua jendela baru sudah terbuka:
echo    - Backend  : http://localhost:%BACKEND_PORT%  (dokumentasi: /docs)
echo    - Frontend : http://localhost:%FRONTEND_PORT%
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

@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js tidak ditemukan. Pasang Node.js, lalu jalankan script ini lagi.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Menginstal dependensi aplikasi mobile...
  call npm install
  if errorlevel 1 (
    echo npm install di folder utama gagal.
    pause
    exit /b 1
  )
)

if not exist "apps\web\node_modules\" (
  echo Menginstal dependensi admin web...
  pushd "apps\web"
  call npm install
  if errorlevel 1 (
    echo npm install di apps\web gagal.
    popd
    pause
    exit /b 1
  )
  popd
)

if not exist "apps\web\.env" (
  echo File apps\web\.env belum ada.
  echo Admin membutuhkan DATABASE_URL dan SESSION_SECRET di file itu.
  pause
  exit /b 1
)

echo.
echo Admin web dan API: http://localhost:3000
echo Login lokal bawaan: admin@tyc.local / ChangeMe123!
echo Aplikasi mobile terbuka di jendela Expo.
echo Tutup masing-masing jendela untuk menghentikan server.
echo.

start "TYC Admin" /D "%~dp0apps\web" cmd /k npm run dev
start "TYC Mobile" /D "%~dp0" cmd /k npm start

endlocal

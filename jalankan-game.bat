@echo off
title Juragan Terkaya: Double Entry - Server
rem ---------------------------------------------------------------------
rem  Klik dua kali file ini untuk menjalankan game.
rem  %~dp0 = folder tempat file ini berada, jadi tidak ada path yang
rem  perlu ditulis manual dan tidak masalah kalau foldernya dipindah.
rem ---------------------------------------------------------------------
cd /d "%~dp0"

echo.
echo   Menjalankan Juragan Terkaya: Double Entry ...
echo   Tunggu sampai muncul tulisan  Local:  http://localhost:5174/
echo.
echo   JANGAN TUTUP JENDELA INI selama game berjalan.
echo   Untuk menghentikan server: tekan Ctrl+C, atau tutup jendela ini.
echo.

call npm run dev
if errorlevel 1 (
  echo.
  echo   npm tidak dikenali, mencoba lewat lokasi standar Node.js ...
  echo.
  call "C:\Program Files\nodejs\npm.cmd" run dev
)

echo.
echo   ================================================================
echo   Server berhenti. Kalau ada tulisan error di atas, kirim ke Claude.
echo   ================================================================
pause

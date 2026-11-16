@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found in PATH.
  pause
  exit /b 1
)
echo Soak is resumable. Closing this window pauses; run again continues.
echo.
node scripts\soak.mjs --resume --hours 24 --interval 60
echo.
echo Progress saved. Run this file again to continue.
pause

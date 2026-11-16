@echo off
setlocal
cd /d "%~dp0.."
node scripts\soak.mjs --status
echo.
pause

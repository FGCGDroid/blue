@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found in PATH.
  pause
  exit /b 1
)
node scripts\maintenance-check.mjs --full --report .tmp\maintenance-report.md
set CODE=%ERRORLEVEL%
echo.
echo Report: .tmp\maintenance-report.md
if not "%CODE%"=="0" echo Maintenance check failed with code %CODE%.
pause
exit /b %CODE%

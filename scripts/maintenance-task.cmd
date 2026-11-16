@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 exit /b 1
node scripts\maintenance-check.mjs --full --report .tmp\maintenance-report.md
exit /b %ERRORLEVEL%

@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Soak Live

where powershell >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 powershell。
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0watch.ps1"
set "CODE=%ERRORLEVEL%"
echo.
echo 观察已退出（soak 本身不受影响）。
pause
exit /b %CODE%

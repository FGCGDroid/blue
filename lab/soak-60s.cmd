@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Soak 60s

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js，请先安装 Node 22+ 并加入 PATH。
  pause
  exit /b 1
)

echo 60 秒 soak：4 并发，40 rps。
echo 只打本地 127.0.0.1，不压 DSH。
echo.

node scenarios\soak.mjs --duration 60 --concurrency 4 --rate 40
set "CODE=%ERRORLEVEL%"
echo.
if "%CODE%"=="0" (echo ✓ soak 通过) else (echo ✗ soak 失败)
pause
exit /b %CODE%

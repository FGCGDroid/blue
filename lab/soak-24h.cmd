@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Soak 24h

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js，请先安装 Node 22+ 并加入 PATH。
  pause
  exit /b 1
)

if not exist ".run" mkdir ".run"

echo 24 小时 soak：8 并发，40 rps。
echo 输出写入 .run\soak-24h.log
echo 只打本地 127.0.0.1，不要关闭窗口。
echo.
echo 5 秒后开始，Ctrl+C 可取消。
timeout /t 5 /nobreak >nul

node scenarios\soak.mjs --duration 86400 --concurrency 8 --rate 40 > ".run\soak-24h.log" 2>&1
set "CODE=%ERRORLEVEL%"
echo.
echo 退出代码: %CODE%
echo 日志: %CD%\.run\soak-24h.log
if "%CODE%"=="0" (echo ✓ 24h soak 通过) else (echo ✗ 24h soak 失败)
pause
exit /b %CODE%

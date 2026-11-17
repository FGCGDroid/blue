@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Start

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js，请先安装 Node 22+ 并加入 PATH。
  pause
  exit /b 1
)

echo 启动本地靶场...
echo 上游: http://127.0.0.1:18080
echo 网关: http://127.0.0.1:18787
echo 按 Ctrl+C 停止。
echo.

node start.mjs
set "CODE=%ERRORLEVEL%"
echo.
echo 靶场已退出，代码 %CODE%。
pause
exit /b %CODE%

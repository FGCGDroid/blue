@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Vectors

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js，请先安装 Node 22+ 并加入 PATH。
  pause
  exit /b 1
)

node scenarios\vectors.mjs
set "CODE=%ERRORLEVEL%"
echo.
if "%CODE%"=="0" (echo ✓ 40 条路径契约通过) else (echo ✗ 路径契约失败)
pause
exit /b %CODE%

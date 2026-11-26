@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Test

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未找到 Node.js，请先安装 Node 22+ 并加入 PATH。
  pause
  exit /b 1
)

echo [1/2] 本地靶场验收...
node scenarios\acceptance.mjs
if errorlevel 1 goto fail

echo.
echo [2/2] 40 条路径契约...
node scenarios\vectors.mjs
if errorlevel 1 goto fail

echo.
echo ✓ 全部通过
pause
exit /b 0

:fail
echo.
echo ✗ 测试失败，请查看上面的输出。
pause
exit /b 1

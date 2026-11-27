@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 远程防控中心

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo 没找到 Node.js，请先安装 22 或更高版本：https://nodejs.org/
  echo.
  pause
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) < 22 ? 1 : 0)"
if errorlevel 1 (
  echo.
  echo Node.js 版本太低，需要 22 或更高版本。
  node --version
  echo.
  pause
  exit /b 1
)

if not exist config.json (
  echo.
  echo 第一次运行，进入配置向导。
  echo.
  node setup.mjs
  if errorlevel 1 (
    echo 配置失败。
    pause
    exit /b 1
  )
)

echo.
echo 启动中，关闭这个窗口即停止。
echo 页面地址会在下面打印，或看 config.json 里的端口。
echo.
node hub.mjs
echo.
echo 程序已退出。
pause

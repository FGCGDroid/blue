@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set LOG=%~dp0compare-2.0-3.0-result.txt
node scripts\compare-2.0-3.0.mjs > "%LOG%" 2>&1
set EXITCODE=%ERRORLEVEL%
type "%LOG%"
echo.
echo 结果已保存到：%LOG%
if /I not "%~1"=="--no-pause" pause
exit /b %EXITCODE%

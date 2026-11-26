chcp 65001 >nul
@echo off
setlocal
cd /d "%~dp0"
set LOG=%~dp0shadow-test-result.txt
node scripts\shadow-test.mjs > "%LOG%" 2>&1
set EXITCODE=%ERRORLEVEL%
type "%LOG%"
echo.
if %EXITCODE%==0 (
  echo SHADOW TEST PASS
) else (
  echo SHADOW TEST FAIL
)
echo.
echo 结果已保存到：%LOG%
if /I not "%~1"=="--no-pause" pause
exit /b %EXITCODE%

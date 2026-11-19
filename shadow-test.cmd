@echo off
setlocal
cd /d "%~dp0"
node scripts\shadow-test.mjs
set EXITCODE=%ERRORLEVEL%
echo.
if %EXITCODE%==0 (
  echo SHADOW TEST PASS
) else (
  echo SHADOW TEST FAIL
)
exit /b %EXITCODE%

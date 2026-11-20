@echo off
setlocal
cd /d "%~dp0"
node scripts\compare-2.0-3.0.mjs
set EXITCODE=%ERRORLEVEL%
echo.
if %ERRORLEVEL%==0 (echo COMPARE DONE) else (echo COMPARE FAIL)
exit /b %EXITCODE%

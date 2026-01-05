@echo off
echo ========================================
echo Starting CRM with Huawei E173 Modem
echo ========================================
echo.

echo Setting Huawei E173 COM port...
set HUAWEI_PORT=COM6

echo Starting backend server...
cd /d "%~dp0\backend"
echo Backend starting on http://localhost:5000
echo.

node server.js

if %errorlevel% neq 0 (
  echo.
  echo ❌ Backend failed to start
  echo Try running: node server.js manually
  echo.
)

pause

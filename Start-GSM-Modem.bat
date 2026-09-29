@echo off
title Huawei E173 GSM Modem Service (Port 3174)
echo ============================================================
echo   B^&Y CRM — Huawei E173 GSM Modem Service
echo ============================================================
echo.
echo   Starting modem server on ALL network interfaces...
echo   Other users on this network can connect using this PC's IP.
echo.
cd /d "%~dp0huawei-e173-test" 2>nul || cd /d "%~dp0"
node server.js --port=3174
pause

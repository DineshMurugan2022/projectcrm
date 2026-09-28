@echo off
title Huawei E173 GSM Modem Service (Port 3174)
echo ========================================================
echo   Starting Huawei E173 GSM Modem Service for B&Y CRM...
echo ========================================================
cd /d "%~dp0huawei-e173-test" 2>nul || cd /d "%~dp0"
node server.js --port=3174
pause

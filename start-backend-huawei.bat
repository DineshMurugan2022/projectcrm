@echo off
echo Starting CRM Backend with Huawei E173 on COM6...
echo.

set HUAWEI_PORT=COM6
echo Using Huawei E173 on %HUAWEI_PORT%

cd /d "%~dp0\backend"
echo Starting server...
node server.js

pause

@echo off
echo Starting CRM Backend with Debug Info...
echo.

echo Checking Node.js version...
node --version

echo Checking MongoDB connection...
ping -n 1 localhost > nul
if %errorlevel% equ 0 (
  echo ✅ Localhost accessible
) else (
  echo ❌ Localhost not accessible - check network
)

echo.
echo Starting backend server...
cd /d "%~dp0\backend"
node server.js

pause

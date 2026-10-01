@echo off
title CRM Personal Modem Agent
cd /d "%~dp0huawei-e173-test"
if not exist node_modules\socket.io-client (
  echo Installing modem agent dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
echo Open http://127.0.0.1:3174 to see your pairing code.
echo In CRM, open Call - GSM Modem Setup and paste that code.
echo Keep this window running. Each user runs this on their own PC.
node server.js --port=3174
pause

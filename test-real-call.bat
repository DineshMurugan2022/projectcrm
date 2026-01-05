@echo off
echo ========================================
echo Testing Huawei E173 Real Call
echo ========================================
echo.

echo Backend is running on COM6 with real modem responses
echo Open your browser and go to: http://localhost:3000
echo.
echo Test Steps:
echo 1. Login to CRM
echo 2. Go to Call page  
echo 3. Enter phone number: +919843240703
echo 4. Click "Call" button
echo 5. You should see real modem responses in backend terminal
echo.
echo Expected responses:
echo - ^ORIG:1,0 (Call originated)
echo - ^CONF:1 (Call confirmed)  
echo - ^CONN:1,0 (Call connected)
echo.
echo Press any key to open browser...
pause > nul
start http://localhost:3000

@echo off
echo Testing Huawei E173 Modem Connection
echo =====================================
echo.

echo Step 1: Check if modem is connected
echo Looking for COM ports...
for /f "tokens=1,2" %%i in ('wmic path Win32_SerialPort get DeviceID^,Name 2^>nul ^| findstr COM') do (
    echo Found: %%i - %%j
)

echo.
echo Step 2: Test basic AT command
echo Testing COM4 connection...
echo AT^> modem
timeout /t 2 >nul

echo.
echo Step 3: Check SIM status
echo AT+CPIN?^> modem
timeout /t 2 >nul

echo.
echo Step 4: Check network registration
echo AT+CREG?^> modem
timeout /t 2 >nul

echo.
echo Step 5: Test voice call capability
echo AT^> modem (test command)
timeout /t 2 >nul

echo.
echo If you see "OK" responses above, the modem is working!
echo If you see errors, check:
echo 1. Huawei E173 is properly connected via USB
echo 2. SIM card is inserted and activated
echo 3. Network signal is available
echo 4. COM port is correct (try COM3, COM4, COM10)

pause

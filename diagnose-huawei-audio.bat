@echo off
echo ========================================
echo Huawei E173 Audio Diagnostic Tool
echo ========================================
echo.

echo Step 1: Check Huawei E173 Audio Device
echo Looking for Huawei E173 in Device Manager...
powershell -Command "Get-WmiObject -Class Win32_SoundDevice | Where-Object {$_.Name -like '*Huawei*' -or $_.Name -like '*E173*' -or $_.Name -like '*USB Audio*'} | Select-Object Name, DeviceID, StatusInfo"

echo.
echo Step 2: Check USB Headset
echo Looking for USB headsets...
powershell -Command "Get-WmiObject -Class Win32_SoundDevice | Where-Object {$_.Name -like '*USB*' -or $_.Name -like '*Headset*'} | Select-Object Name, DeviceID"

echo.
echo Step 3: Check Volume Mixer Settings
echo Opening Volume Mixer...
start sndvol

echo.
echo Step 4: Check Sound Settings
echo Opening Sound settings...
start mmsys.cpl

echo.
echo Step 5: Test Huawei E173 Audio
echo.
echo Instructions:
echo 1. In Volume Mixer, look for "Huawei E173" or "USB Audio"
echo 2. Make sure it's NOT muted
echo 3. Set volume to maximum
echo 4. Set it as default communication device
echo 5. Test with Mobile Partner first
echo 6. Then test with CRM
echo.
echo If you see Huawei E173 in Device Manager but not in Sound:
echo - Install Huawei E173 drivers
echo - Reinstall Mobile Partner software
echo - Check Windows Update for drivers
echo.

pause

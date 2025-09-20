@echo off
echo ================================================
echo   USB SIM800 + USB Logitech Headset Setup
echo ================================================
echo.
echo This script will help you set up BOTH:
echo 1. USB SIM800 module (connected to COM5)
echo 2. USB Logitech headset (for voice communication)
echo.
echo HARDWARE CONFIGURATION:
echo ======================
echo USB SIM800: Handles call connection (no audio ports)
echo USB Headset: Handles voice audio (microphone + speakers)
echo Software Bridge: Routes audio between SIM800 data and headset
echo.
echo STEP 1: Verify Hardware Connections
echo =====================================
echo 1. USB SIM800 module plugged into computer (COM5)
echo 2. USB Logitech headset plugged into computer
echo 3. Both devices show as "ready" in Device Manager
echo 4. SIM800 LED blinking (indicates network connection)
echo.
pause
echo.

echo STEP 2: Windows Audio Configuration
echo ===================================
echo We'll now open Windows Sound settings...
echo.
start ms-settings:sound
echo.
echo Please configure in Sound Settings:
echo.
echo OUTPUT (Speakers):
echo 1. Find "Logitech USB Headset" in device list
echo 2. Click on it to select as DEFAULT
echo 3. Test audio by clicking "Test" button
echo 4. Adjust volume to comfortable level
echo.
echo INPUT (Microphone):
echo 1. Find "Logitech USB Headset Microphone"
echo 2. Click on it to select as DEFAULT
echo 3. Test microphone - speak and watch level bar
echo 4. Adjust microphone sensitivity if needed
echo.
pause
echo.

echo STEP 3: Software Audio Bridge Setup
echo ====================================
echo The CRM application creates a SOFTWARE BRIDGE:
echo.
echo Audio Flow During Calls:
echo 1. Caller's voice -> SIM800 USB data -> Computer processing
echo 2. Computer processing -> USB Logitech headset speakers
echo 3. Your voice -> USB Logitech headset microphone -> Computer
echo 4. Computer -> SIM800 USB data -> Caller
echo.
echo This is automatic when you:
echo 1. Start your CRM application
echo 2. Click "Setup USB Bridge" button
echo 3. See green checkmark for "Ready for Calls"
echo.
pause
echo.

echo STEP 4: Test Your Complete Setup
echo =================================
echo 1. Go to your CRM application
echo 2. Look for "USB Audio Bridge Status" panel
echo 3. Verify both devices show as connected:
echo    - USB SIM800: Connected to COM5 ✓
echo    - USB Logitech Headset: Connected ✓
echo    - Software Audio Bridge: Active ✓
echo 4. Make a test call using the dialer
echo 5. You should hear dial tone in Logitech headset
echo 6. Speak into Logitech headset microphone
echo 7. Audio flows: SIM800 <-> Computer <-> Logitech Headset
echo.
echo If successful, you'll have full voice communication!
echo.

echo STEP 5: Troubleshooting
echo =======================
echo If audio doesn't work:
echo.
echo USB SIM800 Issues:
echo 1. Check Device Manager for "Ports (COM & LPT)"
echo 2. Verify SIM800 shows as COM5
echo 3. LED on SIM800 should be blinking
echo 4. Restart CRM application if COM port issues
echo.
echo USB Logitech Headset Issues:
echo 1. Try different USB port
echo 2. Update headset drivers from Device Manager
echo 3. Test headset with other apps (music, videos)
echo 4. Check Windows volume levels (system and headset)
echo.
echo Software Bridge Issues:
echo 1. Restart CRM application as Administrator
echo 2. Check Windows Sound settings (both devices default)
echo 3. Verify no other apps using audio devices
echo 4. Try unplugging and reconnecting both USB devices
echo.

echo ================================================
echo   USB SIM800 + USB Headset Setup Complete! 📞🎧
echo ================================================
echo.
echo Your configuration:
echo • USB SIM800 module: Handles call connection (COM5)
echo • USB Logitech headset: Handles voice audio
echo • Software bridge: Routes audio between devices
echo • Full voice communication during calls
echo.
echo Audio flow: Caller <-> SIM800 USB <-> Computer <-> Logitech Headset
echo.
echo Ready to make professional calls with clear audio!
echo.
pause
# Huawei E173 Audio Check PowerShell Script
Write-Host "========================================" -ForegroundColor Green
Write-Host "Huawei E173 Audio Device Check" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Checking Huawei E173 Audio Devices..." -ForegroundColor Yellow
$huaweiAudio = Get-WmiObject -Class Win32_SoundDevice | Where-Object {
    $_.Name -like "*Huawei*" -or 
    $_.Name -like "*HUAWEI*" -or 
    $_.Name -like "*E173*" -or
    $_.Name -like "*Modem*" -or
    $_.Name -like "*USB Audio*"
}

if ($huaweiAudio) {
    Write-Host "✅ Huawei E173 Audio Device Found:" -ForegroundColor Green
    $huaweiAudio | ForEach-Object {
        Write-Host "  - Name: $($_.Name)" -ForegroundColor White
        Write-Host "  - Status: $($_.StatusInfo)" -ForegroundColor White
    }
} else {
    Write-Host "❌ Huawei E173 Audio Device NOT Found" -ForegroundColor Red
    Write-Host "  This could mean:" -ForegroundColor Yellow
    Write-Host "  - Huawei E173 drivers not installed" -ForegroundColor Yellow
    Write-Host "  - Audio device disabled" -ForegroundColor Yellow
    Write-Host "  - Device not properly connected" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Checking USB Headsets..." -ForegroundColor Yellow
$usbHeadsets = Get-WmiObject -Class Win32_SoundDevice | Where-Object {
    $_.Name -like "*USB*" -or 
    $_.Name -like "*Headset*" -or
    $_.Name -like "*Logitech*" -or
    $_.Name -like "*Jabra*"
}

if ($usbHeadsets) {
    Write-Host "✅ USB Headset Found:" -ForegroundColor Green
    $usbHeadsets | ForEach-Object {
        Write-Host "  - Name: $($_.Name)" -ForegroundColor White
    }
} else {
    Write-Host "⚠️ No USB Headset Found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Checking All Audio Devices..." -ForegroundColor Yellow
$allAudio = Get-WmiObject -Class Win32_SoundDevice | Select-Object Name, StatusInfo
Write-Host "All Audio Devices:" -ForegroundColor Cyan
$allAudio | ForEach-Object {
    $status = if ($_.StatusInfo -eq 3) { "✅ OK" } else { "⚠️ $($_.StatusInfo)" }
    Write-Host "  - $($_.Name) - $status" -ForegroundColor White
}

Write-Host ""
Write-Host "Step 4: Recommendations:" -ForegroundColor Yellow
if ($huaweiAudio) {
    Write-Host "✅ Huawei E173 audio device detected" -ForegroundColor Green
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Open Volume Mixer (sndvol)" -ForegroundColor White
    Write-Host "  2. Look for 'Huawei E173' or 'USB Audio'" -ForegroundColor White
    Write-Host "  3. Make sure it's NOT muted" -ForegroundColor White
    Write-Host "  4. Set volume to maximum" -ForegroundColor White
    Write-Host "  5. Test with Mobile Partner first" -ForegroundColor White
    Write-Host "  6. Then test with CRM call" -ForegroundColor White
} else {
    Write-Host "❌ Huawei E173 audio device NOT detected" -ForegroundColor Red
    Write-Host "📝 Troubleshooting:" -ForegroundColor Cyan
    Write-Host "  1. Reinstall Huawei E173 drivers" -ForegroundColor White
    Write-Host "  2. Install Mobile Partner software" -ForegroundColor White
    Write-Host "  3. Check Device Manager for unknown devices" -ForegroundColor White
    Write-Host "  4. Try different USB port" -ForegroundColor White
    Write-Host "  5. Update Windows drivers" -ForegroundColor White
}

Write-Host ""
Write-Host "Press Enter to continue..." -ForegroundColor Green
Read-Host

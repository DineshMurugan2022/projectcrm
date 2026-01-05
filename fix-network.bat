@echo off
echo Fixing Huawei E173 Network Conflicts...
echo.

echo Step 1: Setting Ethernet as primary interface...
netsh interface ipv4 set interface "Ethernet" metric=10

echo Step 2: Setting Cellular as secondary interface...
netsh interface ipv4 set interface "Cellular" metric=100

echo Step 3: Disabling Cellular auto-connect...
netsh interface set interface "Cellular" admin=disabled

echo.
echo Network configuration updated!
echo Please restart your browser and backend server.
echo.
pause

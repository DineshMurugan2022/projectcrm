#!/bin/bash

echo "🔧 CRM Network Recovery Script"
echo "================================"

# Kill any processes that might be interfering
echo "Stopping conflicting processes..."
pkill -f "Mobile Partner"
pkill -f "Huawei"

# Reset network interfaces
echo "Resetting network configuration..."
ifconfig eth0 down
ifconfig eth0 up

# Clear DNS cache
echo "Clearing DNS cache..."
sudo dscacheutil -flushcache
# Or for Linux: sudo systemctl restart systemd-resolved

echo "✅ Network recovery complete!"
echo "Please restart your browser and backend server."

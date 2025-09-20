#!/bin/bash
set -eu

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run with sudo. Please run it as: sudo bash /home/ubuntu/install_cloudflared.sh" >&2
  exit 1
fi

# Install cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "☁️ Installing cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
else
    echo "✅ cloudflared is already installed."
fi

# Create config.yml
echo "📝 Creating /etc/cloudflared/config.yml..."
mkdir -p /etc/cloudflared/
cat > /etc/cloudflared/config.yml << EOF
tunnel: francoise-observability
ingress:
  - hostname: grafana.francoise.wenzelarifiandi.com
    service: http://localhost:3000
  - hostname: prometheus.francoise.wenzelarifiandi.com
    service: http://localhost:9090
  - hostname: alertmanager.francoise.wenzelarifiandi.com
    service: http://localhost:9093
  - service: http_status:404
EOF

# Install the service
if [ -n "$1" ]; then
  echo "🔑 Installing cloudflared service with your token..."
  cloudflared service install "$1"
  echo "🎉 cloudflared service installed successfully!"
else
  echo "⚠️ Token not provided. Please run this script again with the token as an argument:"
  echo "   sudo bash /home/ubuntu/install_cloudflared.sh <YOUR_TOKEN_HERE>"
  exit 1
fi

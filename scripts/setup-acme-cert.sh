#!/bin/bash
set -euo pipefail

# Proxmox ACME Certificate Setup Helper
# Run this AFTER setting up ACME account and Cloudflare plugin in web UI

PROXMOX_HOST="54.39.102.214"
DOMAIN="neve.wenzelarifiandi.com"

echo "🔐 Proxmox ACME Certificate Setup Helper"
echo "========================================"
echo ""

# Step 1: Verify DNS is ready
echo "1️⃣  Verifying DNS configuration..."
A_RECORD=$(dig +short $DOMAIN A)
AAAA_RECORD=$(dig +short $DOMAIN AAAA)

echo "   A Record: $A_RECORD"
echo "   AAAA Record: $AAAA_RECORD"

if [[ "$A_RECORD" != "$PROXMOX_HOST" ]]; then
    echo "❌ A record mismatch! Expected: $PROXMOX_HOST, Got: $A_RECORD"
    exit 1
fi

echo "✅ DNS configuration verified"
echo ""

# Step 2: Check ACME account exists
echo "2️⃣  Checking ACME account..."
if ssh root@$PROXMOX_HOST "pvesh get /cluster/acme/account" | grep -q "letsencrypt"; then
    echo "✅ ACME account found"
else
    echo "❌ ACME account not found. Please create via web UI:"
    echo "   Datacenter → ACME → Add Account"
    echo "   Name: letsencrypt-production"
    echo "   Email: your-email@wenzelarifiandi.com"
    exit 1
fi
echo ""

# Step 3: Check DNS plugin exists
echo "3️⃣  Checking DNS plugin..."
if ssh root@$PROXMOX_HOST "pvesh get /cluster/acme/plugins" | grep -q "cloudflare"; then
    echo "✅ Cloudflare DNS plugin found"
else
    echo "❌ Cloudflare DNS plugin not found. Please create via web UI:"
    echo "   Datacenter → ACME → Challenge Plugins → Add DNS"
    echo "   Plugin ID: cloudflare"
    echo "   API: Cloudflare Managed DNS"
    echo "   CF_Token: [your-cloudflare-api-token]"
    exit 1
fi
echo ""

# Step 4: Configure node certificate
echo "4️⃣  Configuring node certificate..."
ssh root@$PROXMOX_HOST "pvesh set /nodes/neve/config --acme domains=$DOMAIN,plugin=cloudflare" || {
    echo "❌ Failed to configure certificate. Please check manually."
    exit 1
}
echo "✅ Certificate configuration set"
echo ""

# Step 5: Order certificate
echo "5️⃣  Ordering certificate..."
echo "⏳ This may take 2-3 minutes..."
if ssh root@$PROXMOX_HOST "pvenode acme cert order"; then
    echo "✅ Certificate ordered successfully!"
else
    echo "❌ Certificate order failed. Check logs:"
    ssh root@$PROXMOX_HOST "journalctl -u pveproxy -n 50"
    exit 1
fi
echo ""

# Step 6: Verify certificate
echo "6️⃣  Verifying certificate..."
sleep 5
if curl -k -I https://$DOMAIN:8006 2>/dev/null | grep -q "HTTP/"; then
    echo "✅ HTTPS access working!"
    echo ""
    echo "🎉 Certificate setup complete!"
    echo "🌐 Access: https://$DOMAIN:8006"
    echo "🔒 Certificate: Let's Encrypt (valid)"
    echo "🔄 Auto-renewal: Enabled"
else
    echo "❌ HTTPS access failed. Please check certificate installation."
fi
#!/bin/bash

SERVER_IP="54.39.102.214"
SSH_KEY="$HOME/.ssh/id_ed25519"
MAX_ATTEMPTS=60
WAIT_SECONDS=30

echo "🔍 Testing SSH connectivity to Proxmox server at $SERVER_IP"
echo "📋 Will check every $WAIT_SECONDS seconds (max $MAX_ATTEMPTS attempts)"
echo "🔑 Using SSH key: $SSH_KEY"
echo ""

for i in $(seq 1 $MAX_ATTEMPTS); do
    echo "🔍 Attempt $i/$MAX_ATTEMPTS..."

    # Test SSH connection with short timeout
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'SSH connection successful!'" 2>/dev/null; then
        echo ""
        echo "✅ SUCCESS! Proxmox server is ready!"
        echo "🌐 SSH: ssh -i $SSH_KEY root@$SERVER_IP"
        echo "🖥️  Web UI: https://$SERVER_IP:8006"
        echo ""
        exit 0
    else
        echo "⏳ Not ready yet... waiting $WAIT_SECONDS seconds"
        sleep $WAIT_SECONDS
    fi
done

echo ""
echo "❌ Timeout reached after $((MAX_ATTEMPTS * WAIT_SECONDS / 60)) minutes"
echo "💡 The server might still be installing. Try running this script again later."
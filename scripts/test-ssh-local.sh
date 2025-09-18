#!/bin/bash
# Quick SSH test script to verify your Oracle connection locally

set -e

echo "🔧 Local SSH Connection Test"
echo "============================"
echo ""

# Check if oracle_key_correct exists
if [ ! -f ~/.ssh/oracle_key_correct ]; then
    echo "❌ ~/.ssh/oracle_key_correct not found"
    echo "Available keys in ~/.ssh/:"
    ls -la ~/.ssh/*.key* 2>/dev/null || echo "No .key files found"
    exit 1
fi

echo "✅ Found ~/.ssh/oracle_key_correct"
echo "Key fingerprint: $(ssh-keygen -lf ~/.ssh/oracle_key_correct)"
echo ""

# You'll need to replace this with your actual Oracle server IP
ORACLE_HOST="${ORACLE_HOST:-YOUR_ORACLE_SERVER_IP}"

if [ "$ORACLE_HOST" = "YOUR_ORACLE_SERVER_IP" ]; then
    echo "⚠️ Please set your Oracle server IP:"
    echo "export ORACLE_HOST=your.oracle.server.ip"
    echo "Then run this script again: ./test-ssh-local.sh"
    exit 1
fi

echo "🔗 Testing SSH connection to Oracle server..."
echo "Host: $ORACLE_HOST"
echo ""

# Test ubuntu user
echo "Testing ubuntu user:"
if ssh -i ~/.ssh/oracle_key_correct -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$ORACLE_HOST 'echo "✅ SSH connection successful for ubuntu user"'; then
    echo ""
    echo "🎉 SUCCESS: SSH works with ubuntu user!"
    echo ""
    echo "Your GitHub Secret should now work. The deployment workflow should:"
    echo "1. Parse the SSH key correctly"
    echo "2. Connect successfully as ubuntu user"
    echo "3. Deploy Zitadel configuration"
else
    echo ""
    echo "❌ ubuntu user failed, trying opc user:"
    if ssh -i ~/.ssh/oracle_key_correct -o ConnectTimeout=10 -o StrictHostKeyChecking=no opc@$ORACLE_HOST 'echo "✅ SSH connection successful for opc user"'; then
        echo ""
        echo "🎉 SUCCESS: SSH works with opc user!"
    else
        echo ""
        echo "❌ Both ubuntu and opc failed. Check:"
        echo "1. Oracle server IP is correct"
        echo "2. Oracle Cloud security rules allow SSH (port 22)"
        echo "3. The public key is in ~/.ssh/authorized_keys on the server"
        echo ""
        echo "Public key to add to server:"
        ssh-keygen -y -f ~/.ssh/oracle_key_correct
    fi
fi
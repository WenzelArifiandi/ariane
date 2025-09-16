#!/bin/bash
# SSH Key Preparation Script for GitHub Secrets
# This script helps format SSH keys properly for GitHub Actions

set -e

echo "🔑 SSH Key Preparation for GitHub Secrets"
echo "=========================================="
echo ""

if [ $# -eq 0 ]; then
    echo "Usage: $0 <path-to-private-key>"
    echo ""
    echo "This script will:"
    echo "  1. Validate the SSH private key format"
    echo "  2. Show the corresponding public key"
    echo "  3. Format the key for GitHub Secrets"
    echo ""
    echo "Example: $0 ~/.ssh/id_rsa"
    exit 1
fi

KEY_FILE="$1"

if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file not found: $KEY_FILE"
    exit 1
fi

echo "🔍 Analyzing key file: $KEY_FILE"
echo ""

# Check file permissions
PERMS=$(stat -c%a "$KEY_FILE" 2>/dev/null || stat -f%A "$KEY_FILE")
echo "File permissions: $PERMS"
if [ "$PERMS" != "600" ] && [ "$PERMS" != "0600" ]; then
    echo "⚠️  Warning: Key file permissions should be 600 for security"
    echo "   Run: chmod 600 $KEY_FILE"
fi

# Validate key format
echo ""
echo "🔍 Key validation:"
if ssh-keygen -y -f "$KEY_FILE" >/dev/null 2>&1; then
    echo "✅ SSH private key format is valid"

    # Show public key info
    PUB_KEY=$(ssh-keygen -y -f "$KEY_FILE")
    KEY_TYPE=$(echo "$PUB_KEY" | cut -d' ' -f1)
    echo "🔑 Key type: $KEY_TYPE"
    echo "📋 Fingerprint: $(echo "$PUB_KEY" | ssh-keygen -lf -)"
    echo ""

    # Show public key
    echo "📄 Public key (add this to ~/.ssh/authorized_keys on your server):"
    echo "---"
    echo "$PUB_KEY"
    echo "---"
    echo ""

    # Format for GitHub Secret
    echo "🔧 GitHub Secret formatting:"
    echo ""

    echo "Method 1 - Direct copy (recommended):"
    echo "Copy the entire key content including headers/footers:"
    echo ""
    cat "$KEY_FILE"
    echo ""
    echo "☝️  Copy everything above (including -----BEGIN/END----- lines)"
    echo ""

    echo "Method 2 - Base64 encoded (if Method 1 doesn't work):"
    BASE64_KEY=$(base64 -w 0 "$KEY_FILE" 2>/dev/null || base64 -i "$KEY_FILE")
    echo "$BASE64_KEY"
    echo ""
    echo "☝️  Copy the base64 string above"
    echo ""

    echo "🎯 Steps to use this key:"
    echo "1. Copy one of the formatted keys above"
    echo "2. Go to GitHub repository → Settings → Secrets and variables → Actions"
    echo "3. Create/update secret named 'ORACLE_SSH_KEY'"
    echo "4. Paste the copied key content"
    echo "5. Ensure the public key is in ~/.ssh/authorized_keys on your Oracle server"

else
    echo "❌ SSH private key format is invalid"
    echo ""
    echo "🔍 Detailed error:"
    ssh-keygen -y -f "$KEY_FILE" 2>&1 || true
    echo ""
    echo "🔧 Common issues:"
    echo "1. Key file is password-protected (needs to be unencrypted)"
    echo "2. Key file is corrupted or incomplete"
    echo "3. Key file is not actually a private key"
    echo ""
    echo "🛠️  To create a new unencrypted key:"
    echo "  ssh-keygen -t ed25519 -f ~/.ssh/oracle_key -N ''"
    echo "  ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_key -N ''"
fi
#!/bin/bash
# SOPS Setup Script for Cell v0
# This script helps set up SOPS encryption for Ansible secrets

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔒 Setting up SOPS encryption for Cell v0"

# Check if SOPS and age are installed
if ! command -v sops &> /dev/null; then
    echo "❌ SOPS is not installed. Please install it first:"
    echo "   brew install sops (macOS)"
    echo "   Or download from: https://github.com/mozilla/sops/releases"
    exit 1
fi

if ! command -v age-keygen &> /dev/null; then
    echo "❌ age is not installed. Please install it first:"
    echo "   brew install age (macOS)"
    echo "   Or download from: https://github.com/FiloSottile/age/releases"
    exit 1
fi

# Create age directory if it doesn't exist
mkdir -p ~/.config/sops/age

# Check if age key exists
if [[ ! -f ~/.config/sops/age/keys.txt ]]; then
    echo "🔑 Generating new age key..."
    age-keygen -o ~/.config/sops/age/keys.txt
    echo "✅ Age key generated and saved to ~/.config/sops/age/keys.txt"

    # Extract public key
    PUBLIC_KEY=$(grep -o 'age1[a-z0-9]*' ~/.config/sops/age/keys.txt)
    echo "📋 Your public key is: $PUBLIC_KEY"
    echo "❗ Please update .sops.yaml with this public key before encrypting files"
else
    PUBLIC_KEY=$(grep -o 'age1[a-z0-9]*' ~/.config/sops/age/keys.txt)
    echo "✅ Age key already exists: $PUBLIC_KEY"
fi

# Update .sops.yaml with the actual public key
echo "🔧 Updating .sops.yaml with your public key..."
sed -i.bak "s/age1hl8zdfp4q9p5k2m7x8j3w6v9r2n4t8s5l1c9b6h3f0d7e4a2z8x5y7w0q3m1n6k4s2/$PUBLIC_KEY/g" "$ANSIBLE_DIR/.sops.yaml"

echo "📝 Please update the secrets files with actual values before encrypting:"
echo "   1. Edit secrets/cell-v0.yml with real secrets"
echo "   2. Edit group_vars/all/secrets.yml with real secrets"
echo "   3. Run: sops -e -i secrets/cell-v0.yml"
echo "   4. Run: sops -e -i group_vars/all/secrets.yml"

echo ""
echo "🔐 SOPS setup complete!"
echo "📖 See SOPS.md for detailed usage instructions"
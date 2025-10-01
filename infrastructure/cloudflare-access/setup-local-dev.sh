#!/bin/bash
# Local Development Setup for Cloudflare Access
# Run this script to set up environment variables for local Terraform development

set -e

echo "🔐 Cloudflare Access - Local Development Setup"
echo "=============================================="
echo ""

# Function to prompt for input with validation
prompt_for_value() {
    local var_name="$1"
    local description="$2"
    local current_value="${!var_name}"
    
    if [[ -n "$current_value" ]]; then
        echo "✅ $var_name is already set"
        return 0
    fi
    
    echo "📝 Please enter $description:"
    read -r value
    
    if [[ -z "$value" ]]; then
        echo "❌ Value cannot be empty"
        return 1
    fi
    
    export "$var_name"="$value"
    echo "✅ $var_name set successfully"
}

# Check if environment variables are already set
echo "🔍 Checking current environment variables..."
echo ""

# Prompt for missing values
if ! prompt_for_value "TF_VAR_cloudflare_api_token" "Cloudflare API Token (get from https://dash.cloudflare.com/profile/api-tokens)"; then
    exit 1
fi

if ! prompt_for_value "TF_VAR_cipher_client_id" "Cipher OIDC Client ID (from ZITADEL application)"; then
    exit 1
fi

if ! prompt_for_value "TF_VAR_cipher_client_secret" "Cipher OIDC Client Secret (from ZITADEL application)"; then
    exit 1
fi

echo ""
echo "🎉 All environment variables are set!"
echo ""
echo "💡 To make these persistent, add to your shell profile (~/.zshrc or ~/.bashrc):"
echo ""
echo "export TF_VAR_cloudflare_api_token=\"\$TF_VAR_cloudflare_api_token\""
echo "export TF_VAR_cipher_client_id=\"\$TF_VAR_cipher_client_id\""  
echo "export TF_VAR_cipher_client_secret=\"\$TF_VAR_cipher_client_secret\""
echo ""
echo "🚀 Now you can run terraform without prompts:"
echo "   terraform init"
echo "   terraform plan"
echo "   terraform apply"
echo ""
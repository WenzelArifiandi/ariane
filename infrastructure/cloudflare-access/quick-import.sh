#!/bin/bash
# Quick import script using known Application ID

set -e

echo "🚀 Quick Import for Cloudflare Access Resources"
echo "=============================================="
echo ""

# Known Application ID
APP_ID="2768b19d-a8a6-4866-b42f-f4881629edaf"

# Check required environment variables
if [[ -z "$TF_VAR_cloudflare_api_token" ]]; then
    echo "❌ TF_VAR_cloudflare_api_token is required"
    echo "   Set it with: export TF_VAR_cloudflare_api_token='your_token'"
    exit 1
fi

if [[ -z "$TF_VAR_cloudflare_account_id" ]]; then
    echo "❌ TF_VAR_cloudflare_account_id is required"
    echo "   Set it with: export TF_VAR_cloudflare_account_id='your_account_id'"
    exit 1
fi

API_TOKEN="$TF_VAR_cloudflare_api_token"
ACCOUNT_ID="$TF_VAR_cloudflare_account_id"

echo "✅ Using Application ID: $APP_ID"
echo "✅ Using Account ID: $ACCOUNT_ID"
echo ""

# Function to make API calls
call_api() {
    local endpoint="$1"
    curl -s -H "Authorization: Bearer $API_TOKEN" \
         -H "Content-Type: application/json" \
         "https://api.cloudflare.com/client/v4$endpoint"
}

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init
echo ""

# Import Access Application
echo "📥 Importing Access Application..."
terraform import cloudflare_zero_trust_access_application.cipher "accounts/$ACCOUNT_ID/$APP_ID" || {
    echo "⚠️  Application may already be imported or error occurred"
}
echo ""

# Find and Import Identity Provider
echo "🔍 Finding Identity Provider..."
idps_response=$(call_api "/accounts/$ACCOUNT_ID/access/identity_providers")

if echo "$idps_response" | jq -e '.success' > /dev/null 2>&1; then
    # Try to find Cipher OIDC provider
    idp_id=$(echo "$idps_response" | jq -r '.result[] | select(.name == "Cipher OIDC" or .name | test("cipher"; "i")) | .id' | head -1)

    if [[ -n "$idp_id" ]] && [[ "$idp_id" != "null" ]]; then
        echo "✅ Found Identity Provider ID: $idp_id"
        echo "📥 Importing Identity Provider..."
        terraform import cloudflare_zero_trust_access_identity_provider.cipher_oidc "accounts/$ACCOUNT_ID/$idp_id" || {
            echo "⚠️  Identity Provider may already be imported"
        }
        echo ""
    else
        echo "⚠️  Could not find Cipher OIDC Identity Provider"
        echo "   Please check Cloudflare dashboard manually"
        echo ""
    fi
else
    echo "❌ Failed to query Identity Providers"
    echo "$idps_response" | jq -r '.errors[]?.message // "Unknown error"'
fi

# Check what's imported
echo "📋 Currently imported resources:"
terraform state list
echo ""

# Run plan to see what's needed
echo "🎯 Running terraform plan to check status..."
terraform plan -no-color | tee plan-output.txt
echo ""

echo "✅ Import process complete!"
echo ""
echo "Next steps:"
echo "1. Review the plan output above"
echo "2. If there are still resources to import, check the plan for their IDs"
echo "3. Run 'terraform apply' when ready"

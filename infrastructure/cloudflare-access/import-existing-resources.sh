#!/bin/bash
# Import Existing Cloudflare Access Resources
# This script helps you discover and import existing Access resources into Terraform state

set -e

echo "🔍 Cloudflare Access Resource Import Helper"
echo "==========================================="
echo ""

# Check required environment variables
if [[ -z "$TF_VAR_cloudflare_api_token" ]]; then
    echo "❌ TF_VAR_cloudflare_api_token is required"
    echo "   export TF_VAR_cloudflare_api_token='your_token_here'"
    exit 1
fi

if [[ -z "$TF_VAR_cloudflare_account_id" ]]; then
    echo "❌ TF_VAR_cloudflare_account_id is required"
    echo "   You can find it at: https://dash.cloudflare.com (right sidebar)"
    echo "   export TF_VAR_cloudflare_account_id='your_account_id_here'"
    exit 1
fi

API_TOKEN="$TF_VAR_cloudflare_api_token"
ACCOUNT_ID="$TF_VAR_cloudflare_account_id"

echo "✅ Environment variables set"
echo "   Account ID: $ACCOUNT_ID"
echo ""

# Function to make API calls
call_api() {
    local endpoint="$1"
    curl -s -H "Authorization: Bearer $API_TOKEN" \
         -H "Content-Type: application/json" \
         "https://api.cloudflare.com/client/v4$endpoint"
}

# 1. Find existing Access applications
echo "🔍 Searching for existing Access applications..."
apps_response=$(call_api "/accounts/$ACCOUNT_ID/access/apps")

if echo "$apps_response" | jq -e '.success' > /dev/null 2>&1; then
    cipher_app=$(echo "$apps_response" | jq -r '.result[] | select(.domain == "cipher.wenzelarifiandi.com")')
    
    if [[ "$cipher_app" != "" ]]; then
        app_id=$(echo "$cipher_app" | jq -r '.id')
        app_name=$(echo "$cipher_app" | jq -r '.name')
        echo "✅ Found existing Access application:"
        echo "   Name: $app_name"
        echo "   ID: $app_id"
        echo "   Domain: cipher.wenzelarifiandi.com"
        echo ""
        echo "📋 Import command:"
        echo "   terraform import cloudflare_zero_trust_access_application.cipher accounts/$ACCOUNT_ID/$app_id"
        echo ""
    else
        echo "ℹ️  No existing Access application found for cipher.wenzelarifiandi.com"
    fi
else
    echo "❌ Failed to fetch Access applications"
    echo "$apps_response" | jq -r '.errors[]?.message // "Unknown error"'
fi

# 2. Find existing Identity Providers
echo "🔍 Searching for existing Identity Providers..."
idps_response=$(call_api "/accounts/$ACCOUNT_ID/access/identity_providers")

if echo "$idps_response" | jq -e '.success' > /dev/null 2>&1; then
    cipher_idp=$(echo "$idps_response" | jq -r '.result[] | select(.name == "Cipher OIDC" or .name | test("cipher"; "i"))')
    
    if [[ "$cipher_idp" != "" ]]; then
        idp_id=$(echo "$cipher_idp" | jq -r '.id')
        idp_name=$(echo "$cipher_idp" | jq -r '.name')
        idp_type=$(echo "$cipher_idp" | jq -r '.type')
        echo "✅ Found existing Identity Provider:"
        echo "   Name: $idp_name"
        echo "   ID: $idp_id"
        echo "   Type: $idp_type"
        echo ""
        echo "📋 Import command:"
        echo "   terraform import cloudflare_zero_trust_access_identity_provider.cipher_oidc accounts/$ACCOUNT_ID/$idp_id"
        echo ""
    else
        echo "ℹ️  No existing OIDC Identity Provider found for Cipher"
    fi
else
    echo "❌ Failed to fetch Identity Providers"
    echo "$idps_response" | jq -r '.errors[]?.message // "Unknown error"'
fi

# 3. Find existing Service Tokens
echo "🔍 Searching for existing Service Tokens..."
tokens_response=$(call_api "/accounts/$ACCOUNT_ID/access/service_tokens")

if echo "$tokens_response" | jq -e '.success' > /dev/null 2>&1; then
    cipher_token=$(echo "$tokens_response" | jq -r '.result[] | select(.name == "Cipher Service Token" or .name | test("cipher"; "i"))')
    
    if [[ "$cipher_token" != "" ]]; then
        token_id=$(echo "$cipher_token" | jq -r '.id')
        token_name=$(echo "$cipher_token" | jq -r '.name')
        echo "✅ Found existing Service Token:"
        echo "   Name: $token_name"
        echo "   ID: $token_id"
        echo ""
        echo "📋 Import command:"
        echo "   terraform import cloudflare_zero_trust_access_service_token.cipher_service_token accounts/$ACCOUNT_ID/$token_id"
        echo ""
    else
        echo "ℹ️  No existing Service Token found for Cipher"
    fi
else
    echo "❌ Failed to fetch Service Tokens"
    echo "$tokens_response" | jq -r '.errors[]?.message // "Unknown error"'
fi

# 4. Find existing Policies (if app exists)
if [[ -n "$app_id" ]]; then
    echo "🔍 Searching for existing Access Policies for application $app_id..."
    policies_response=$(call_api "/accounts/$ACCOUNT_ID/access/apps/$app_id/policies")
    
    if echo "$policies_response" | jq -e '.success' > /dev/null 2>&1; then
        policies=$(echo "$policies_response" | jq -r '.result[]')
        
        if [[ "$policies" != "" ]]; then
            echo "$policies_response" | jq -r '.result[] | "✅ Found policy: \(.name) (ID: \(.id))"'
            echo ""
            echo "📋 Policy import commands:"
            echo "$policies_response" | jq -r '.result[] | "   terraform import cloudflare_zero_trust_access_policy." + (.name | gsub(" "; "_") | gsub("[^a-zA-Z0-9_]"; "") | ascii_downcase) + " accounts/'$ACCOUNT_ID'/\(.id)"'
            echo ""
            echo "⚠️  Note: You may need to adjust policy resource names in main.tf to match existing names"
        else
            echo "ℹ️  No existing policies found for the application"
        fi
    else
        echo "❌ Failed to fetch Access Policies"
    fi
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Run the import commands shown above for any existing resources"
echo "2. Update terraform.tfvars.example to include account_id"
echo "3. Run 'terraform plan' to see what changes are needed"
echo "4. Adjust the configuration to match existing resource attributes"
echo "5. Run 'terraform apply' when ready"
echo ""
echo "💡 Pro tip: Use 'terraform show <resource_name>' after import to see current state"
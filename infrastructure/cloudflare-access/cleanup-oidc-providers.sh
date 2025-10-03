#!/bin/bash
set -euo pipefail

# Script to delete all OIDC identity providers from Cloudflare Access
# This allows Terraform to recreate them from scratch

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"

if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
    echo "Error: CLOUDFLARE_API_TOKEN environment variable is required"
    exit 1
fi

if [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
    echo "Error: CLOUDFLARE_ACCOUNT_ID environment variable is required"
    exit 1
fi

echo "🔍 Listing all identity providers..."
RESPONSE=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json")

# Check if request was successful
if ! echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "❌ Failed to list identity providers"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

# Extract OIDC providers
OIDC_PROVIDERS=$(echo "$RESPONSE" | jq -r '.result[] | select(.type == "oidc") | .id')

if [[ -z "$OIDC_PROVIDERS" ]]; then
    echo "✅ No OIDC identity providers found - nothing to delete"
    exit 0
fi

# Count providers
PROVIDER_COUNT=$(echo "$OIDC_PROVIDERS" | wc -l | tr -d ' ')
echo "📋 Found $PROVIDER_COUNT OIDC identity provider(s) to delete"

# Show provider details before deletion
echo "$RESPONSE" | jq -r '.result[] | select(.type == "oidc") | "  - \(.name) (ID: \(.id))"'

echo ""
echo "🗑️  Deleting OIDC providers..."

# Delete each OIDC provider
while IFS= read -r PROVIDER_ID; do
    if [[ -n "$PROVIDER_ID" ]]; then
        echo "  Deleting provider: $PROVIDER_ID"
        DELETE_RESPONSE=$(curl -s -X DELETE \
            "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers/${PROVIDER_ID}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json")

        if echo "$DELETE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
            echo "  ✅ Deleted successfully"
        else
            echo "  ❌ Failed to delete"
            echo "$DELETE_RESPONSE" | jq '.'
        fi
    fi
done <<< "$OIDC_PROVIDERS"

echo ""
echo "🔍 Verifying all OIDC providers are removed..."
VERIFY_RESPONSE=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json")

REMAINING_OIDC=$(echo "$VERIFY_RESPONSE" | jq -r '.result[] | select(.type == "oidc") | .id')

if [[ -z "$REMAINING_OIDC" ]]; then
    echo "✅ All OIDC identity providers have been removed"
    echo "📝 Terraform can now recreate them from scratch"
    exit 0
else
    echo "⚠️  Warning: Some OIDC providers still remain:"
    echo "$VERIFY_RESPONSE" | jq -r '.result[] | select(.type == "oidc") | "  - \(.name) (ID: \(.id))"'
    exit 1
fi

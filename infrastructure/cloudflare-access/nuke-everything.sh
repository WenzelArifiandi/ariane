#!/bin/bash
set -euo pipefail

# Nuclear option: Delete ALL Access resources so Terraform can start fresh

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

echo "🗑️  Deleting ALL Cloudflare Access resources..."

# Delete all Access Applications first (because policies depend on them)
echo "📋 Deleting all Access Applications..."
APPS=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.result[].id')

for APP_ID in $APPS; do
    echo "  Deleting app: $APP_ID"
    curl -s -X DELETE \
        "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${APP_ID}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" > /dev/null
done

# Delete all OIDC identity providers
echo "📋 Deleting all OIDC identity providers..."
OIDC_PROVIDERS=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.result[] | select(.type == "oidc") | .id')

for PROVIDER_ID in $OIDC_PROVIDERS; do
    echo "  Deleting OIDC provider: $PROVIDER_ID"
    curl -s -X DELETE \
        "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers/${PROVIDER_ID}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" > /dev/null
done

echo "✅ All Access resources deleted - Terraform can now create fresh resources"

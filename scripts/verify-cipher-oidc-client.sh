#!/usr/bin/env bash
set -euo pipefail

# Script to verify ZITADEL OIDC client configuration for Cloudflare Access
# Since ZITADEL Admin UI is the easiest way to verify, this script provides manual steps

CLIENT_ID="340307158316941421"
PROJECT_ID="340307138714804333"  # Ariane project
EXPECTED_REDIRECT="https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback"
EXPECTED_POST_LOGOUT="https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=https%3A%2F%2Fwenzelarifiandi.com%2F"

echo "🔍 ZITADEL OIDC Client Configuration Verification"
echo "=================================================="
echo ""
echo "Expected Configuration:"
echo "  Client ID: $CLIENT_ID"
echo "  Project ID: $PROJECT_ID"
echo "  Redirect URI: $EXPECTED_REDIRECT"
echo "  Post Logout Redirect URI: $EXPECTED_POST_LOGOUT"
echo ""
echo "📋 Manual Verification Steps:"
echo "  1. Go to: https://cipher.wenzelarifiandi.com"
echo "  2. Login as admin"
echo "  3. Navigate to: Projects → Ariane → Applications"
echo "  4. Click on 'Cloudflare Access' application (Client ID: $CLIENT_ID)"
echo "  5. Verify under 'Redirect URIs' section:"
echo "     ✓ $EXPECTED_REDIRECT"
echo "  6. Verify under 'Post Logout Redirect URIs' section:"
echo "     ✓ $EXPECTED_POST_LOGOUT"
echo ""
echo "Alternative: Query via ZITADEL API (requires admin token):"
echo ""
echo "  curl -H 'Authorization: Bearer \$ZITADEL_ADMIN_TOKEN' \\"
echo "    'https://cipher.wenzelarifiandi.com/management/v1/projects/$PROJECT_ID/apps/$CLIENT_ID' | jq"
echo ""

# Try to query ZITADEL API if token is available
if [ -n "${ZITADEL_ADMIN_TOKEN:-}" ]; then
    echo "🔍 Querying ZITADEL API..."
    RESPONSE=$(curl -sS "https://cipher.wenzelarifiandi.com/management/v1/projects/$PROJECT_ID/apps/$CLIENT_ID" \
        -H "Authorization: Bearer $ZITADEL_ADMIN_TOKEN" \
        -H "Content-Type: application/json")

    if command -v jq &> /dev/null; then
        echo ""
        echo "✅ Application Configuration:"
        echo "$RESPONSE" | jq -r '
            "  Name: " + (.name // "N/A"),
            "  Client ID: " + (.oidcConfig.clientId // "N/A"),
            "  Auth Method: " + (.oidcConfig.authMethodType // "N/A"),
            "",
            "  Redirect URIs:",
            (.oidcConfig.redirectUris[] // [] | "    - " + .),
            "",
            "  Post Logout Redirect URIs:",
            (.oidcConfig.postLogoutRedirectUris[] // [] | "    - " + .)
        '
    else
        echo ""
        echo "✅ Raw API Response:"
        echo "$RESPONSE"
    fi
else
    echo "ℹ️  ZITADEL_ADMIN_TOKEN not set - using manual verification steps above"
fi

exit 0

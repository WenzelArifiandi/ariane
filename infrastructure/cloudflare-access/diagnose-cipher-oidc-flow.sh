#!/usr/bin/env bash
set -euo pipefail

# Diagnostic script to capture ZITADEL OIDC authorize flow
# This script will trace the OAuth2 flow from /maker through to ZITADEL UI

echo "🔍 ZITADEL OIDC Flow Diagnostic"
echo "================================"
echo ""

# Expected client configuration
EXPECTED_CLIENT_ID="340307158316941421"
EXPECTED_REDIRECT_URI="https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback"
EXPECTED_POST_LOGOUT_REDIRECT="https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=https%3A%2F%2Fwenzelarifiandi.com%2F"

echo "📋 Expected Client Configuration:"
echo "  Client ID: $EXPECTED_CLIENT_ID"
echo "  Redirect URI: $EXPECTED_REDIRECT_URI"
echo "  Post Logout Redirect: $EXPECTED_POST_LOGOUT_REDIRECT"
echo ""

# Step 1: Start from /maker
echo "🌐 Step 1: Testing /maker redirect..."
MAKER_REDIRECT=$(curl -sI "https://wenzelarifiandi.com/maker" | grep -i "^location:" | sed 's/location: //i' | tr -d '\r')
echo "  Redirects to: $MAKER_REDIRECT"
echo ""

# Step 2: Follow to Cloudflare Access login page
echo "🔐 Step 2: Testing Cloudflare Access login page..."
if [[ -n "$MAKER_REDIRECT" ]]; then
    # Extract the redirect URL from the location header
    # The login page should then redirect to ZITADEL authorize endpoint
    echo "  Following redirect (this requires authentication, so we'll trace manually)..."
    echo "  To test: Open in browser: $MAKER_REDIRECT"
    echo ""
fi

# Step 3: Check ZITADEL authorize endpoint format
echo "🎯 Step 3: Expected ZITADEL authorize URL format:"
echo "  https://cipher.wenzelarifiandi.com/oauth/v2/authorize"
echo "  Parameters:"
echo "    - client_id=$EXPECTED_CLIENT_ID"
echo "    - redirect_uri=$EXPECTED_REDIRECT_URI"
echo "    - response_type=code"
echo "    - scope=openid email profile"
echo "    - state=<random>"
echo "    - nonce=<random>"
echo ""

# Step 4: Test ZITADEL UI endpoint directly
echo "🖥️  Step 4: Testing ZITADEL UI endpoint (without requestId)..."
UI_RESPONSE=$(curl -sI "https://cipher.wenzelarifiandi.com/ui/v2/login/loginname" | head -20)
echo "$UI_RESPONSE"
echo ""

# Step 5: Check for common issues
echo "🔍 Step 5: Checking for common issues..."

# Check if Development Mode is still active
echo "  - Checking Cloudflare Development Mode status..."
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "    ⚠️  CLOUDFLARE_API_TOKEN not set - skipping API checks"
else
    ZONE_ID="7ca97d69d8ec2c68feb006df69c64848"
    DEV_MODE=$(curl -sS -X GET \
        "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/development_mode" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" | jq -r '.result.value')
    echo "    Development Mode: $DEV_MODE"
fi
echo ""

# Step 6: Recommendations
echo "📝 Next Steps:"
echo "  1. Open browser DevTools (Network tab)"
echo "  2. Visit: https://wenzelarifiandi.com/maker"
echo "  3. Capture the full redirect chain:"
echo "     - /maker → Cloudflare Access login"
echo "     - Cloudflare Access → ZITADEL /oauth/v2/authorize"
echo "     - ZITADEL authorize → /ui/v2/login/loginname?requestId=oidc_V2_..."
echo "  4. Check if 'Application error' appears on first load or only on refresh"
echo "  5. If only on refresh: confirms expired requestId issue"
echo "  6. If on first load: check browser console for JS errors"
echo ""
echo "🔐 To verify ZITADEL client configuration:"
echo "  1. SSH to cipher VM"
echo "  2. Query ZITADEL API or check Admin UI"
echo "  3. Verify Client ID $EXPECTED_CLIENT_ID has:"
echo "     - Redirect URI: $EXPECTED_REDIRECT_URI"
echo "     - Post Logout Redirect URI: $EXPECTED_POST_LOGOUT_REDIRECT"
echo ""

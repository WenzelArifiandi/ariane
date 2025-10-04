#!/usr/bin/env bash
set -euo pipefail

# Test script to capture full OIDC flow from /maker through to ZITADEL UI
# This will trace redirects and capture requestId lifecycle

echo "🧩 ZITADEL OIDC Flow Test - Fresh requestId Capture"
echo "===================================================="
echo ""

CLIENT_ID="340307158316941421"
EXPECTED_REDIRECT_URI="https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback"

echo "📋 Expected Configuration:"
echo "  Client ID: $CLIENT_ID"
echo "  Redirect URI: $EXPECTED_REDIRECT_URI"
echo ""

# Step 1: Initial /maker request
echo "🌐 Step 1: Testing /maker endpoint..."
MAKER_RESPONSE=$(curl -sI -L --max-redirs 0 "https://wenzelarifiandi.com/maker" 2>&1 || true)
MAKER_LOCATION=$(echo "$MAKER_RESPONSE" | grep -i "^location:" | sed 's/location: //i' | tr -d '\r')

echo "  /maker redirects to:"
echo "  $MAKER_LOCATION"
echo ""

# Step 2: Follow to Cloudflare Access
echo "🔐 Step 2: Cloudflare Access Login..."
if [[ "$MAKER_LOCATION" =~ cloudflareaccess.com ]]; then
    echo "  ✓ Correctly redirects to Cloudflare Access"
    echo "  ℹ️  This requires authentication - cannot follow automatically"
    echo ""
    echo "  Manual steps to capture authorize URL:"
    echo "    1. Open browser in incognito mode"
    echo "    2. Open DevTools → Network tab → Preserve log"
    echo "    3. Visit: https://wenzelarifiandi.com/maker"
    echo "    4. Complete authentication"
    echo "    5. Look for request to: /oauth/v2/authorize"
    echo "    6. Copy full URL with parameters"
else
    echo "  ❌ Unexpected redirect: $MAKER_LOCATION"
fi
echo ""

# Step 3: Expected authorize URL format
echo "🎯 Step 3: Expected /oauth/v2/authorize format..."
cat <<EOF
  URL: https://cipher.wenzelarifiandi.com/oauth/v2/authorize

  Expected Parameters:
    client_id=$CLIENT_ID
    redirect_uri=$EXPECTED_REDIRECT_URI
    response_type=code
    scope=openid email profile
    state=<random>
    nonce=<random>
    code_challenge=<pkce-challenge>
    code_challenge_method=S256
EOF
echo ""

# Step 4: Test ZITADEL UI endpoint health
echo "🖥️  Step 4: Testing ZITADEL UI endpoint (without requestId)..."
UI_STATUS=$(curl -sI "https://cipher.wenzelarifiandi.com/ui/v2/login/loginname" | head -1)
echo "  $UI_STATUS"

if [[ "$UI_STATUS" =~ "200" ]]; then
    echo "  ✓ UI endpoint responds (may show error without valid requestId)"
else
    echo "  ⚠️  Unexpected status: $UI_STATUS"
fi
echo ""

# Step 5: Test OIDC metadata endpoint
echo "🔍 Step 5: Verifying OIDC discovery endpoint..."
OIDC_META=$(curl -sS "https://cipher.wenzelarifiandi.com/.well-known/openid-configuration" | jq -r '.authorization_endpoint, .token_endpoint, .end_session_endpoint' 2>/dev/null || echo "Failed to parse")

if [[ "$OIDC_META" != "Failed to parse" ]]; then
    echo "  ✓ OIDC metadata available:"
    echo "$OIDC_META" | while read line; do echo "    $line"; done
else
    echo "  ❌ Could not fetch OIDC metadata"
fi
echo ""

# Step 6: Instructions for manual testing
echo "📝 Manual Testing Steps:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Test A: Fresh requestId (First Load)"
echo "─────────────────────────────────────"
echo "  1. Open Chrome/Firefox in incognito mode"
echo "  2. Open DevTools → Network tab → Check 'Preserve log'"
echo "  3. Visit: https://wenzelarifiandi.com/maker"
echo "  4. Complete Cloudflare Access authentication"
echo "  5. Observe redirect to ZITADEL /oauth/v2/authorize"
echo "  6. Capture the authorize URL with all parameters"
echo "  7. ZITADEL creates requestId and redirects to:"
echo "     /ui/v2/login/loginname?requestId=oidc_V2_..."
echo "  8. Expected: Login UI loads successfully (HTTP 200)"
echo ""
echo "Test B: Expired requestId (Refresh/Reload)"
echo "──────────────────────────────────────────"
echo "  1. Stay on the /ui/v2/login/loginname?requestId=... page"
echo "  2. Press F5 or Cmd+R to reload"
echo "  3. Expected: 'Application error' appears"
echo "  4. Hypothesis: requestId has been consumed/expired"
echo ""
echo "Test C: Network Capture"
echo "───────────────────────"
echo "  1. During Test B (reload), watch Network tab"
echo "  2. Filter to XHR/Fetch requests"
echo "  3. Look for failing request (4xx/5xx status)"
echo "  4. Click on it → Preview/Response tab"
echo "  5. Note: status code, errorId, endpoint path"
echo "  6. Right-click Network tab → 'Save all as HAR with content'"
echo ""
echo "Test D: Verify redirect_uri Match"
echo "──────────────────────────────────"
echo "  1. From captured authorize URL, extract redirect_uri parameter"
echo "  2. Decode URL encoding: %3A → : , %2F → /"
echo "  3. Verify it exactly matches:"
echo "     $EXPECTED_REDIRECT_URI"
echo "  4. If mismatch → ZITADEL will reject the request"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 7: Provide log inspection commands
echo "🔧 ZITADEL Log Inspection (after capturing requestId):"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  1. SSH to cipher:"
echo "     ./scripts/zitadel-remote-session.sh"
echo ""
echo "  2. Search logs for requestId (replace with actual value):"
echo "     docker compose logs zitadel | grep 'oidc_V2_...'"
echo ""
echo "  3. Look for errors related to:"
echo "     - 'request expired'"
echo "     - 'request not found'"
echo "     - 'redirect_uri mismatch'"
echo "     - 'invalid request'"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

echo "✅ Test script complete!"
echo ""
echo "Next: Run manual tests above and capture:"
echo "  - Full authorize URL"
echo "  - requestId value"
echo "  - HAR file of failing request"
echo "  - ZITADEL server logs"

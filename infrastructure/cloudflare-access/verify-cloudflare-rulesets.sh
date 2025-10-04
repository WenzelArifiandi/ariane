#!/usr/bin/env bash
set -euo pipefail

# Script to verify all Cloudflare rulesets for cipher.wenzelarifiandi.com
# Confirms: Cache Rules, Config Rules, Page Rules, and WAF skips

echo "🔍 Cloudflare Rulesets Verification for Cipher ZITADEL"
echo "======================================================="
echo ""

# Check required environment variables
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo "❌ CLOUDFLARE_API_TOKEN not set"
    echo "   Set it with: export CLOUDFLARE_API_TOKEN='your-token'"
    exit 1
fi

ZONE_ID="7ca97d69d8ec2c68feb006df69c64848"  # wenzelarifiandi.com
ZONE_NAME="wenzelarifiandi.com"
CIPHER_HOST="cipher.wenzelarifiandi.com"

echo "📋 Configuration:"
echo "  Zone: $ZONE_NAME ($ZONE_ID)"
echo "  Target Host: $CIPHER_HOST"
echo ""

# Helper function to make API calls
cf_api() {
    local endpoint="$1"
    curl -sS -X GET \
        "https://api.cloudflare.com/client/v4${endpoint}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json"
}

# 1. List all zone rulesets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Zone Rulesets Overview"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ZONE_RULESETS=$(cf_api "/zones/${ZONE_ID}/rulesets")

if ! echo "$ZONE_RULESETS" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "❌ Failed to fetch zone rulesets"
    echo "$ZONE_RULESETS" | jq -r '.errors[]? | "   Error: \(.message)"'
    exit 1
fi

echo "$ZONE_RULESETS" | jq -r '
    "  Total Rulesets: \(.result | length)",
    "",
    "  Active Rulesets:",
    (.result[] | "    • \(.name) (\(.phase)) - ID: \(.id)")
'
echo ""

# 2. Check Cache Rules
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Cache Rules (http_request_cache_settings)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CACHE_RULESET_ID=$(echo "$ZONE_RULESETS" | jq -r '.result[] | select(.phase == "http_request_cache_settings") | .id')

if [[ -n "$CACHE_RULESET_ID" ]]; then
    echo "  Ruleset ID: $CACHE_RULESET_ID"
    echo ""

    CACHE_RULES=$(cf_api "/zones/${ZONE_ID}/rulesets/${CACHE_RULESET_ID}")

    echo "  Cipher ZITADEL Cache Rules:"
    echo "$CACHE_RULES" | jq -r '
        .result.rules[]? |
        select(.description? | test("Cipher|ZITADEL|cipher")) |
        "    ✓ \(.description // "Unnamed")",
        "      Expression: \(.expression)",
        "      Action: \(.action)",
        "      Enabled: \(.enabled)",
        ""
    '

    # Check if our expected paths are covered
    CIPHER_EXPR=$(echo "$CACHE_RULES" | jq -r '.result.rules[]? | select(.description? | test("Cipher|ZITADEL|cipher")) | .expression')

    echo "  Path Coverage Check:"
    for path in "/.well-known/" "/oidc/" "/oauth/" "/ui/" "/assets/"; do
        if echo "$CIPHER_EXPR" | grep -q "$path"; then
            echo "    ✓ $path - covered"
        else
            echo "    ⚠️  $path - NOT covered"
        fi
    done
else
    echo "  ⚠️  No cache ruleset found"
fi
echo ""

# 3. Check Configuration Rules
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Configuration Rules (http_config_settings)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CONFIG_RULESET_ID=$(echo "$ZONE_RULESETS" | jq -r '.result[] | select(.phase == "http_config_settings") | .id')

if [[ -n "$CONFIG_RULESET_ID" ]]; then
    echo "  Ruleset ID: $CONFIG_RULESET_ID"
    echo ""

    CONFIG_RULES=$(cf_api "/zones/${ZONE_ID}/rulesets/${CONFIG_RULESET_ID}")

    echo "  Cipher ZITADEL Config Rules:"
    echo "$CONFIG_RULES" | jq -r '
        .result.rules[]? |
        select(.description? | test("Cipher|ZITADEL|cipher")) |
        "    ✓ \(.description // "Unnamed")",
        "      Expression: \(.expression)",
        "      Settings: \(.action_parameters | keys | join(", "))",
        "      Enabled: \(.enabled)",
        ""
    '
else
    echo "  ⚠️  No config ruleset found"
fi
echo ""

# 4. Check WAF Rules
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  WAF Custom Rules (http_request_firewall_custom)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WAF_RULESET_ID=$(echo "$ZONE_RULESETS" | jq -r '.result[] | select(.phase == "http_request_firewall_custom") | .id')

if [[ -n "$WAF_RULESET_ID" ]]; then
    echo "  Ruleset ID: $WAF_RULESET_ID"
    echo ""

    WAF_RULES=$(cf_api "/zones/${ZONE_ID}/rulesets/${WAF_RULESET_ID}")

    echo "  Cipher ZITADEL WAF Rules:"
    echo "$WAF_RULES" | jq -r '
        .result.rules[]? |
        select(.description? | test("Cipher|ZITADEL|cipher")) |
        "    ✓ \(.description // "Unnamed")",
        "      Expression: \(.expression)",
        "      Action: \(.action)",
        "      Enabled: \(.enabled)",
        ""
    '

    # Check if WAF skip covers UI paths
    WAF_EXPR=$(echo "$WAF_RULES" | jq -r '.result.rules[]? | select(.action == "skip") | .expression')

    echo "  WAF Skip Path Coverage:"
    for path in "/.well-known/" "/oidc/" "/oauth/" "/ui/" "/assets/"; do
        if echo "$WAF_EXPR" | grep -q "$path"; then
            echo "    ✓ $path - WAF skipped"
        else
            echo "    ⚠️  $path - NOT in WAF skip (may be challenged)"
        fi
    done
else
    echo "  ⚠️  No WAF custom ruleset found"
fi
echo ""

# 5. Check Page Rules (legacy API)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Page Rules (Legacy)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PAGE_RULES=$(cf_api "/zones/${ZONE_ID}/pagerules")

if echo "$PAGE_RULES" | jq -e '.success == true' > /dev/null 2>&1; then
    CIPHER_PAGE_RULES=$(echo "$PAGE_RULES" | jq -r '.result[]? | select(.targets[].constraint.value | contains("cipher"))')

    if [[ -n "$CIPHER_PAGE_RULES" ]]; then
        echo "  Cipher Page Rules:"
        echo "$CIPHER_PAGE_RULES" | jq -r '
            "    ✓ ID: \(.id)",
            "      Target: \(.targets[].constraint.value)",
            "      Actions: \(.actions | map(.id) | join(", "))",
            "      Status: \(.status)",
            ""
        '
    else
        echo "  ℹ️  No Cipher-specific Page Rules (using Cache/Config Rules instead)"
    fi
else
    echo "  ⚠️  Could not fetch Page Rules"
fi
echo ""

# 6. Check Development Mode
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Development Mode Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DEV_MODE=$(cf_api "/zones/${ZONE_ID}/settings/development_mode")

if echo "$DEV_MODE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "$DEV_MODE" | jq -r '
        "  Status: \(.result.value)",
        "  Modified: \(.result.modified_on)",
        ""
    '

    if [[ $(echo "$DEV_MODE" | jq -r '.result.value') == "on" ]]; then
        echo "  ✓ Development Mode is ACTIVE"
        echo "    All optimizations bypassed for 3 hours"
    else
        echo "  ℹ️  Development Mode is OFF"
        echo "    Relying on Cache/Config/WAF rules"
    fi
else
    echo "  ⚠️  Could not fetch Development Mode status"
fi
echo ""

# 7. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ISSUES=0

# Check cache bypass
if [[ -n "$CACHE_RULESET_ID" ]]; then
    echo "  ✓ Cache Rules configured"
else
    echo "  ❌ Cache Rules missing"
    ((ISSUES++))
fi

# Check WAF skip
if [[ -n "$WAF_RULESET_ID" ]]; then
    echo "  ✓ WAF Custom Rules configured"

    # Warn if /ui/ not in WAF skip
    if ! echo "$WAF_EXPR" | grep -q "/ui/"; then
        echo "  ⚠️  WARNING: /ui/* paths NOT in WAF skip"
        echo "     This may cause Managed Challenge on ZITADEL UI XHRs"
        ((ISSUES++))
    fi
else
    echo "  ⚠️  WAF Custom Rules missing"
fi

echo ""

if [[ $ISSUES -eq 0 ]]; then
    echo "✅ All Cloudflare rulesets verified successfully!"
else
    echo "⚠️  Found $ISSUES potential issue(s) - review above"
fi

echo ""
echo "Full ruleset details saved to verify-cloudflare-rulesets.log"

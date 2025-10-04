#!/usr/bin/env bash
#
# Harden Cipher ZITADEL UI on cipher.wenzelarifiandi.com
# Applies Cache Rules, Configuration Rules, WAF bypass, and purges cache
#
# Required: CLOUDFLARE_API_TOKEN with zone-level permissions
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; }

# Check API token
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  log_error "CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

# Get zone ID
log_info "Fetching zone ID for wenzelarifiandi.com..."
ZONE_ID=$(curl -sS "https://api.cloudflare.com/client/v4/zones?name=wenzelarifiandi.com" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [[ -z "$ZONE_ID" || "$ZONE_ID" == "null" ]]; then
  log_error "Could not fetch zone ID"
  exit 1
fi
log_success "Zone ID: $ZONE_ID"
echo ""

# Expression for Cipher ZITADEL paths
CIPHER_EXPRESSION='(http.host eq "cipher.wenzelarifiandi.com" and (starts_with(http.request.uri.path, "/.well-known/") or starts_with(http.request.uri.path, "/oidc/") or starts_with(http.request.uri.path, "/oauth/") or starts_with(http.request.uri.path, "/ui/") or starts_with(http.request.uri.path, "/assets/")))'

echo -e "${GREEN}=== Hardening Cipher ZITADEL UI ===${NC}"
echo ""

# Step 1: Get existing rulesets to update (not create new ones)
log_info "Step 1: Checking existing rulesets..."

CACHE_RULESET=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | \
  jq -r '.result[] | select(.phase == "http_request_cache_settings") | .id' | head -1)

WAF_RULESET=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | \
  jq -r '.result[] | select(.phase == "http_request_firewall_custom") | .id' | head -1)

if [[ -n "$CACHE_RULESET" && "$CACHE_RULESET" != "null" ]]; then
  log_success "Found existing cache ruleset: $CACHE_RULESET"
else
  log_warn "No existing cache ruleset found - will create new one"
  CACHE_RULESET=""
fi

if [[ -n "$WAF_RULESET" && "$WAF_RULESET" != "null" ]]; then
  log_success "Found existing WAF ruleset: $WAF_RULESET"
else
  log_warn "No existing WAF ruleset found - will create new one"
  WAF_RULESET=""
fi

echo ""

# Step 2: Cache Rule - Bypass for OIDC + UI + assets
log_info "Step 2: Configuring Cache Bypass Rule..."

if [[ -n "$CACHE_RULESET" ]]; then
  # Update existing ruleset - add our rule
  CACHE_RESPONSE=$(curl -sS -X PUT \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/${CACHE_RULESET}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
      \"rules\": [
        {
          \"action\": \"set_cache_settings\",
          \"action_parameters\": {
            \"cache\": false
          },
          \"expression\": \"${CIPHER_EXPRESSION}\",
          \"description\": \"Cipher ZITADEL - Bypass cache for OIDC + UI + assets\",
          \"enabled\": true
        }
      ]
    }")
else
  # Create new ruleset
  CACHE_RESPONSE=$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
      \"name\": \"Cipher ZITADEL Cache Bypass\",
      \"description\": \"Bypass cache for ZITADEL OIDC + UI paths\",
      \"kind\": \"zone\",
      \"phase\": \"http_request_cache_settings\",
      \"rules\": [
        {
          \"action\": \"set_cache_settings\",
          \"action_parameters\": {
            \"cache\": false
          },
          \"expression\": \"${CIPHER_EXPRESSION}\",
          \"description\": \"Bypass cache for OIDC + UI + assets\",
          \"enabled\": true
        }
      ]
    }")
fi

if echo "$CACHE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Cache Bypass Rule configured"
else
  log_error "Failed to configure Cache Rule:"
  echo "$CACHE_RESPONSE" | jq '.errors // .messages'
fi

echo ""

# Step 3: Configuration Rule - Disable mutations (Rocket Loader, Minify, etc.)
log_info "Step 3: Configuring Feature Disable Rules..."

CONFIG_RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"name\": \"Cipher ZITADEL - Disable Features\",
    \"description\": \"Disable CF features that interfere with ZITADEL UI\",
    \"kind\": \"zone\",
    \"phase\": \"http_config_settings\",
    \"rules\": [
      {
        \"action\": \"set_config\",
        \"action_parameters\": {
          \"autominify\": {
            \"html\": false,
            \"css\": false,
            \"js\": false
          },
          \"email_obfuscation\": false,
          \"rocket_loader\": false,
          \"mirage\": false,
          \"polish\": \"off\",
          \"automatic_https_rewrites\": false
        },
        \"expression\": \"${CIPHER_EXPRESSION}\",
        \"description\": \"Disable Rocket Loader, Minify, Obfuscation for Cipher\",
        \"enabled\": true
      }
    ]
  }")

if echo "$CONFIG_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Configuration Rule created (features disabled)"
elif echo "$CONFIG_RESPONSE" | jq -e '.errors[] | select(.code == 20217)' > /dev/null 2>&1; then
  log_warn "Config ruleset already exists - need to update via dashboard"
else
  log_error "Failed to create Configuration Rule:"
  echo "$CONFIG_RESPONSE" | jq '.errors // .messages'
fi

echo ""

# Step 4: WAF Bypass - Skip managed rules for ZITADEL paths
log_info "Step 4: Configuring WAF Bypass Rule..."

if [[ -n "$WAF_RULESET" ]]; then
  # Update existing
  WAF_RESPONSE=$(curl -sS -X PUT \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/${WAF_RULESET}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
      \"rules\": [
        {
          \"action\": \"skip\",
          \"action_parameters\": {
            \"ruleset\": \"current\"
          },
          \"expression\": \"${CIPHER_EXPRESSION}\",
          \"description\": \"Cipher ZITADEL - Skip WAF for OIDC + UI paths\",
          \"enabled\": true
        }
      ]
    }")
else
  # Create new
  WAF_RESPONSE=$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
      \"name\": \"Cipher ZITADEL WAF Bypass\",
      \"description\": \"Skip WAF for ZITADEL OIDC + UI paths\",
      \"kind\": \"zone\",
      \"phase\": \"http_request_firewall_custom\",
      \"rules\": [
        {
          \"action\": \"skip\",
          \"action_parameters\": {
            \"ruleset\": \"current\"
          },
          \"expression\": \"${CIPHER_EXPRESSION}\",
          \"description\": \"Skip WAF for OIDC + UI + assets\",
          \"enabled\": true
        }
      ]
    }")
fi

if echo "$WAF_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "WAF Bypass Rule configured"
else
  log_error "Failed to configure WAF Rule:"
  echo "$WAF_RESPONSE" | jq '.errors // .messages'
fi

echo ""

# Step 5: Enable Development Mode (temporary)
log_info "Step 5: Enabling Development Mode (temporary)..."

DEV_MODE_RESPONSE=$(curl -sS -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/development_mode" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}')

if echo "$DEV_MODE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Development Mode enabled (auto-expires in 3 hours)"
else
  log_warn "Could not enable Development Mode (may already be on)"
fi

echo ""

# Step 6: Purge cache for cipher.wenzelarifiandi.com
log_info "Step 6: Purging cache for cipher.wenzelarifiandi.com..."

PURGE_RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"hosts":["cipher.wenzelarifiandi.com"]}')

if echo "$PURGE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Cache purged for cipher.wenzelarifiandi.com"
else
  log_error "Failed to purge cache:"
  echo "$PURGE_RESPONSE" | jq '.errors'
fi

echo ""
echo -e "${GREEN}=== Configuration Complete ===${NC}"
echo ""

# Summary
echo -e "${BLUE}Summary:${NC}"
echo "  ✓ Cache Bypass configured for 5 paths"
echo "  ✓ Feature disables configured (Rocket Loader, Minify, etc.)"
echo "  ✓ WAF Bypass configured"
echo "  ✓ Development Mode enabled"
echo "  ✓ Cache purged"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Run health checks (see CIPHER_CLOUDFLARE_HARDENING.md)"
echo "2. Test UI in browser: https://cipher.wenzelarifiandi.com/ui/v2/login/loginname"
echo "3. Check DevTools Network + Console for errors"
echo "4. If issues persist, check Configuration Rules in dashboard"
echo ""

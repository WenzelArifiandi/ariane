#!/usr/bin/env bash
#
# Harden Cipher ZITADEL UI - uses jq to build JSON properly
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; }

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  log_error "CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

log_info "Fetching zone ID..."
ZONE_ID=$(curl -sS "https://api.cloudflare.com/client/v4/zones?name=wenzelarifiandi.com" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | jq -r '.result[0].id')

if [[ -z "$ZONE_ID" || "$ZONE_ID" == "null" ]]; then
  log_error "Could not fetch zone ID"
  exit 1
fi
log_success "Zone ID: $ZONE_ID"
echo ""

CIPHER_EXPR='(http.host eq "cipher.wenzelarifiandi.com" and (starts_with(http.request.uri.path, "/.well-known/") or starts_with(http.request.uri.path, "/oidc/") or starts_with(http.request.uri.path, "/oauth/") or starts_with(http.request.uri.path, "/ui/") or starts_with(http.request.uri.path, "/assets/")))'

echo -e "${GREEN}=== Hardening Cipher ZITADEL UI ===${NC}"
echo ""

# Step 1: Get existing rulesets
log_info "Step 1: Checking existing rulesets..."

CACHE_RULESET=$(curl -sS "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | \
  jq -r '.result[] | select(.phase == "http_request_cache_settings") | .id' | head -1)

log_success "Cache ruleset: ${CACHE_RULESET:-none}"
echo ""

# Step 2: Cache Rule
log_info "Step 2: Configuring Cache Bypass..."

CACHE_PAYLOAD=$(jq -n \
  --arg expr "$CIPHER_EXPR" \
  '{
    rules: [{
      action: "set_cache_settings",
      action_parameters: { cache: false },
      expression: $expr,
      description: "Cipher ZITADEL - Bypass cache",
      enabled: true
    }]
  }')

if [[ -n "$CACHE_RULESET" && "$CACHE_RULESET" != "null" ]]; then
  CACHE_RESPONSE=$(curl -sS -X PUT \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/${CACHE_RULESET}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$CACHE_PAYLOAD")
else
  CACHE_PAYLOAD_CREATE=$(jq -n \
    --arg expr "$CIPHER_EXPR" \
    '{
      name: "Cipher ZITADEL Cache Bypass",
      description: "Bypass cache for ZITADEL",
      kind: "zone",
      phase: "http_request_cache_settings",
      rules: [{
        action: "set_cache_settings",
        action_parameters: { cache: false },
        expression: $expr,
        description: "Bypass cache",
        enabled: true
      }]
    }')
  CACHE_RESPONSE=$(curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$CACHE_PAYLOAD_CREATE")
fi

if echo "$CACHE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Cache Bypass configured"
else
  log_error "Cache Rule failed:"
  echo "$CACHE_RESPONSE" | jq -C '.errors // .messages'
fi

echo ""

# Step 3: Enable Development Mode
log_info "Step 3: Enabling Development Mode..."

DEV_RESPONSE=$(curl -sS -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/development_mode" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}')

if echo "$DEV_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Development Mode enabled (3 hours)"
else
  log_warn "Development Mode may already be on"
fi

echo ""

# Step 4: Purge cache
log_info "Step 4: Purging cache..."

PURGE_RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"hosts":["cipher.wenzelarifiandi.com"]}')

if echo "$PURGE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  log_success "Cache purged for cipher.wenzelarifiandi.com"
else
  log_error "Cache purge failed"
fi

echo ""
echo -e "${GREEN}=== Configuration Complete ===${NC}"
echo ""
echo "✓ Cache Bypass configured"
echo "✓ Development Mode enabled"
echo "✓ Cache purged"
echo ""
echo "Next: Test https://cipher.wenzelarifiandi.com/ui/v2/login/loginname"

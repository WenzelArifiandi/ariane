#!/usr/bin/env bash
#
# Configure Cloudflare zone rules for cipher.wenzelarifiandi.com
# This script uses the Cloudflare API directly to create Cache Rules and WAF bypass
#
# Required environment variables:
#   CLOUDFLARE_API_TOKEN - API token with zone-level permissions
#   CLOUDFLARE_ZONE_ID   - Zone ID for wenzelarifiandi.com
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check required env vars
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo -e "${RED}Error: CLOUDFLARE_API_TOKEN not set${NC}"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  echo -e "${YELLOW}CLOUDFLARE_ZONE_ID not set, fetching...${NC}"
  CLOUDFLARE_ZONE_ID=$(curl -sS -X GET \
    "https://api.cloudflare.com/client/v4/zones?name=wenzelarifiandi.com" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.result[0].id')

  if [[ -z "$CLOUDFLARE_ZONE_ID" || "$CLOUDFLARE_ZONE_ID" == "null" ]]; then
    echo -e "${RED}Error: Could not fetch zone ID${NC}"
    exit 1
  fi
  echo -e "${GREEN}Zone ID: $CLOUDFLARE_ZONE_ID${NC}"
fi

echo -e "${GREEN}=== Configuring Cipher ZITADEL Zone Rules ===${NC}"
echo ""

# 1. Create Cache Rule
echo -e "${YELLOW}1. Creating Cache Rule for OIDC + UI paths...${NC}"

CACHE_RULE_RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Cipher ZITADEL Cache Bypass",
    "description": "Bypass cache for ZITADEL OIDC endpoints and UI assets",
    "kind": "zone",
    "phase": "http_request_cache_settings",
    "rules": [
      {
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": false
        },
        "expression": "(http.host eq \"cipher.wenzelarifiandi.com\" and (starts_with(http.request.uri.path, \"/.well-known/\") or starts_with(http.request.uri.path, \"/oidc/v1/\") or starts_with(http.request.uri.path, \"/oauth/v2/\") or starts_with(http.request.uri.path, \"/ui/\") or starts_with(http.request.uri.path, \"/assets/\")))",
        "description": "Bypass cache for OIDC endpoints and UI",
        "enabled": true
      }
    ]
  }')

if echo "$CACHE_RULE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Cache Rule created${NC}"
elif echo "$CACHE_RULE_RESPONSE" | jq -e '.errors[] | select(.code == 10021)' > /dev/null 2>&1; then
  echo -e "${YELLOW}Cache Rule already exists, skipping...${NC}"
else
  echo -e "${RED}✗ Failed to create Cache Rule:${NC}"
  echo "$CACHE_RULE_RESPONSE" | jq '.errors'
fi

echo ""

# 2. Create WAF Bypass Rule
echo -e "${YELLOW}2. Creating WAF Bypass Rule for ZITADEL paths...${NC}"

WAF_RULE_RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Cipher ZITADEL WAF Bypass",
    "description": "Skip WAF for ZITADEL OIDC endpoints and UI",
    "kind": "zone",
    "phase": "http_request_firewall_custom",
    "rules": [
      {
        "action": "skip",
        "action_parameters": {
          "ruleset": "current"
        },
        "expression": "(http.host eq \"cipher.wenzelarifiandi.com\" and (starts_with(http.request.uri.path, \"/.well-known/\") or starts_with(http.request.uri.path, \"/oidc/v1/\") or starts_with(http.request.uri.path, \"/oauth/v2/\") or starts_with(http.request.uri.path, \"/ui/\") or starts_with(http.request.uri.path, \"/assets/\")))",
        "description": "Skip WAF for OIDC and UI paths",
        "enabled": true
      }
    ]
  }')

if echo "$WAF_RULE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ WAF Bypass Rule created${NC}"
elif echo "$WAF_RULE_RESPONSE" | jq -e '.errors[] | select(.code == 10021)' > /dev/null 2>&1; then
  echo -e "${YELLOW}WAF Bypass Rule already exists, skipping...${NC}"
else
  echo -e "${RED}✗ Failed to create WAF Bypass Rule:${NC}"
  echo "$WAF_RULE_RESPONSE" | jq '.errors'
fi

echo ""

# 3. Purge cache for cipher.wenzelarifiandi.com
echo -e "${YELLOW}3. Purging cache for cipher.wenzelarifiandi.com...${NC}"

PURGE_RESPONSE=$(curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "hosts": ["cipher.wenzelarifiandi.com"]
  }')

if echo "$PURGE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Cache purged${NC}"
else
  echo -e "${RED}✗ Failed to purge cache:${NC}"
  echo "$PURGE_RESPONSE" | jq '.errors'
fi

echo ""
echo -e "${GREEN}=== Configuration Complete ===${NC}"
echo ""
echo -e "${YELLOW}Note: Page Rules cannot be created via API with account tokens.${NC}"
echo -e "${YELLOW}Please configure Page Rules manually via Cloudflare Dashboard:${NC}"
echo ""
echo "  1. cipher.wenzelarifiandi.com/.well-known/*"
echo "  2. cipher.wenzelarifiandi.com/oidc/v1/*"
echo "  3. cipher.wenzelarifiandi.com/oauth/v2/*"
echo "  4. cipher.wenzelarifiandi.com/ui/*"
echo "  5. cipher.wenzelarifiandi.com/assets/*"
echo ""
echo "Settings for each:"
echo "  - Cache Level: Bypass"
echo "  - Email Obfuscation: Off"
echo "  - Rocket Loader: Off"
echo "  - Mirage: Off"
echo "  - Auto HTTPS Rewrites: Off"
echo ""
echo -e "${GREEN}See infrastructure/CIPHER_CLOUDFLARE_HARDENING.md for complete docs.${NC}"

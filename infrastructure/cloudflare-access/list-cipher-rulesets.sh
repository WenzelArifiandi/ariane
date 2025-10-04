#!/usr/bin/env bash
#
# List existing Cloudflare rulesets for wenzelarifiandi.com zone
#

set -euo pipefail

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  CLOUDFLARE_ZONE_ID=$(curl -sS "https://api.cloudflare.com/client/v4/zones?name=wenzelarifiandi.com" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | jq -r '.result[0].id')
fi

echo "Zone ID: $CLOUDFLARE_ZONE_ID"
echo ""
echo "=== Existing Rulesets ==="
echo ""

curl -sS "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" | \
  jq -r '.result[] | "ID: \(.id)\nName: \(.name)\nPhase: \(.phase)\nKind: \(.kind)\nRules: \(.rules | length)\n"'

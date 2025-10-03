#!/usr/bin/env bash
# Ensure Cloudflare Access resources are imported into Terraform state.
# This script is idempotent and safe to run multiple times.
# CRITICAL: Prevents duplicate resource creation by importing existing resources first

set -euo pipefail

if [[ -z "${TF_VAR_cloudflare_api_token:-}" ]]; then
  echo "[ensure-imports] ERROR: TF_VAR_cloudflare_api_token is required" >&2
  exit 1
fi

if [[ -z "${TF_VAR_cloudflare_account_id:-}" ]]; then
  echo "[ensure-imports] ERROR: TF_VAR_cloudflare_account_id is required" >&2
  exit 1
fi

API_TOKEN="$TF_VAR_cloudflare_api_token"
ACCOUNT_ID="$TF_VAR_cloudflare_account_id"

call_api() {
  local endpoint="$1"
  local response
  response=$(curl -s \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4$endpoint")

  if ! echo "$response" | jq -e '.success == true' >/dev/null 2>&1; then
    echo "[ensure-imports] API Error: $endpoint" >&2
    echo "$response" | jq '.' >&2
    return 1
  fi

  echo "$response"
}

state_exists() {
  local address="$1"
  terraform state show "$address" >/dev/null 2>&1
}

ensure_import() {
  local address="$1"
  local import_id="$2"

  if [[ -z "$import_id" || "$import_id" == "null" ]]; then
    echo "[ensure-imports] ⚠️  WARNING: No resource found for $address - Terraform will create a new one"
    return
  fi

  if state_exists "$address"; then
    echo "[ensure-imports] ✅ $address already in state (ID: $import_id)"
    return
  fi

  echo "[ensure-imports] 🔄 Importing $address -> $import_id"
  if ! terraform import "$address" "$import_id" 2>&1 | grep -v "Refreshing state"; then
    echo "[ensure-imports] ❌ Import failed for $address" >&2
    return 1
  fi
  echo "[ensure-imports] ✅ Successfully imported $address"
}

echo "[ensure-imports] 🔍 Searching for existing Cloudflare Access resources..."

# Import Cipher OIDC Identity Provider
echo "[ensure-imports] Looking for OIDC identity providers..."
idps_json=$(call_api "/accounts/$ACCOUNT_ID/access/identity_providers")
echo "$idps_json" | jq -r '.result[] | select(.type == "oidc") | "  - \(.name) (ID: \(.id))"' >&2

cipher_idp_id=$(echo "$idps_json" | jq -r '.result[] | select(.type == "oidc" and .name == "Cipher OIDC") | .id' | head -n 1)
ensure_import "cloudflare_zero_trust_access_identity_provider.cipher_oidc" "accounts/$ACCOUNT_ID/$cipher_idp_id"

# Import Maker Access Application
echo "[ensure-imports] Looking for Access applications..."
apps_json=$(call_api "/accounts/$ACCOUNT_ID/access/apps")
echo "$apps_json" | jq -r '.result[] | "  - \(.name) (\(.domain)) (ID: \(.id))"' >&2

maker_app_id=$(echo "$apps_json" | jq -r '.result[] | select(.domain == "wenzelarifiandi.com/maker") | .id' | head -n 1)
ensure_import "cloudflare_zero_trust_access_application.maker" "accounts/$ACCOUNT_ID/$maker_app_id"

# Import Maker Access Policy
if [[ -n "$maker_app_id" && "$maker_app_id" != "null" ]]; then
  echo "[ensure-imports] Looking for policies for application $maker_app_id..."
  maker_policies=$(call_api "/accounts/$ACCOUNT_ID/access/apps/$maker_app_id/policies")
  echo "$maker_policies" | jq -r '.result[] | "  - \(.name) (ID: \(.id))"' >&2

  maker_policy_id=$(echo "$maker_policies" | jq -r '.result[0].id' | head -n 1)
  ensure_import "cloudflare_zero_trust_access_policy.maker_policy" "accounts/$ACCOUNT_ID/$maker_app_id/$maker_policy_id"
fi

echo "[ensure-imports] ✅ Import check complete"

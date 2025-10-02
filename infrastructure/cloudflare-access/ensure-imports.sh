#!/usr/bin/env bash
# Ensure Cloudflare Access resources are imported into Terraform state.
# This script is idempotent and safe to run multiple times.

set -euo pipefail

if [[ -z "${TF_VAR_cloudflare_api_token:-}" ]]; then
  echo "[ensure-imports] TF_VAR_cloudflare_api_token is required" >&2
  exit 1
fi

if [[ -z "${TF_VAR_cloudflare_account_id:-}" ]]; then
  echo "[ensure-imports] TF_VAR_cloudflare_account_id is required" >&2
  exit 1
fi

API_TOKEN="$TF_VAR_cloudflare_api_token"
ACCOUNT_ID="$TF_VAR_cloudflare_account_id"

call_api() {
  local endpoint="$1"
  curl -s \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4$endpoint"
}

state_exists() {
  local address="$1"
  terraform state show "$address" >/dev/null 2>&1
}

ensure_import() {
  local address="$1"
  local import_id="$2"

  if [[ -z "$import_id" || "$import_id" == "null" ]]; then
    echo "[ensure-imports] Skipping $address (no import ID provided)" >&2
    return
  fi

  if state_exists "$address"; then
    echo "[ensure-imports] $address already in state"
    return
  fi

  echo "[ensure-imports] Importing $address -> $import_id"
  terraform import "$address" "$import_id"
}

apps_json=$(call_api "/accounts/$ACCOUNT_ID/access/apps")

auth_app_id=$(echo "$apps_json" | jq -r '.result[] | select(.domain == "auth.wenzelarifiandi.com") | .id' | head -n 1)
maker_app_id=$(echo "$apps_json" | jq -r '.result[] | select(.domain == "wenzelarifiandi.com/maker") | .id' | head -n 1)

ensure_import "cloudflare_zero_trust_access_application.auth" "accounts/$ACCOUNT_ID/$auth_app_id"
ensure_import "cloudflare_zero_trust_access_application.maker" "accounts/$ACCOUNT_ID/$maker_app_id"

idps_json=$(call_api "/accounts/$ACCOUNT_ID/access/identity_providers")

cipher_idp_id=$(echo "$idps_json" | jq -r '.result[] | select(.name == "Cipher OIDC" or (.name | test("cipher"; "i"))) | .id' | head -n 1)
ensure_import "cloudflare_zero_trust_access_identity_provider.cipher_oidc" "accounts/$ACCOUNT_ID/$cipher_idp_id"

policies_for_app() {
  local app_id="$1"
  if [[ -z "$app_id" || "$app_id" == "null" ]]; then
    echo '{}' && return
  fi
  call_api "/accounts/$ACCOUNT_ID/access/apps/$app_id/policies"
}

auth_policies=$(policies_for_app "$auth_app_id")
maker_policies=$(policies_for_app "$maker_app_id")

cipher_policy_id=$(echo "$auth_policies" | jq -r '.result[] | select(.name == "Allow Cipher OIDC Users") | .id' | head -n 1)
service_policy_id=$(echo "$auth_policies" | jq -r '.result[] | select(.name == "Allow Service Token") | .id' | head -n 1)
maker_policy_id=$(echo "$maker_policies" | jq -r '.result[] | select(.name == "Allow Cipher OIDC Users for Maker") | .id' | head -n 1)

ensure_import "cloudflare_zero_trust_access_policy.cipher_oidc_policy" "accounts/$ACCOUNT_ID/$auth_app_id/$cipher_policy_id"
ensure_import "cloudflare_zero_trust_access_policy.cipher_service_policy" "accounts/$ACCOUNT_ID/$auth_app_id/$service_policy_id"
ensure_import "cloudflare_zero_trust_access_policy.maker_policy" "accounts/$ACCOUNT_ID/$maker_app_id/$maker_policy_id"

service_tokens_json=$(call_api "/accounts/$ACCOUNT_ID/access/service_tokens")
service_token_id=$(echo "$service_tokens_json" | jq -r '.result[] | select(.name == "Cipher Service Token" or (.name | test("cipher"; "i"))) | .id' | head -n 1)

ensure_import "cloudflare_zero_trust_access_service_token.cipher_service_token" "accounts/$ACCOUNT_ID/$service_token_id"

echo "[ensure-imports] Import check complete"

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
  if ! output=$(terraform import "$address" "$import_id" 2>&1); then
    echo "[ensure-imports] Skipped import (provider bug or resource missing): $address" >&2
    echo "$output" >&2
    return
  fi
  if [[ -n "$output" ]]; then
    echo "$output"
  fi
}

# Import Cipher OIDC Identity Provider
idps_json=$(call_api "/accounts/$ACCOUNT_ID/access/identity_providers")
cipher_idp_id=$(echo "$idps_json" | jq -r '.result[] | select(.name == "Cipher OIDC" or (.name | test("cipher"; "i"))) | .id' | head -n 1)
ensure_import "cloudflare_zero_trust_access_identity_provider.cipher_oidc" "accounts/$ACCOUNT_ID/$cipher_idp_id"

# Import Maker Access Application
apps_json=$(call_api "/accounts/$ACCOUNT_ID/access/apps")
maker_app_id=$(echo "$apps_json" | jq -r '.result[] | select(.domain == "wenzelarifiandi.com/maker") | .id' | head -n 1)
ensure_import "cloudflare_zero_trust_access_application.maker" "accounts/$ACCOUNT_ID/$maker_app_id"

# Import Maker Access Policy
if [[ -n "$maker_app_id" && "$maker_app_id" != "null" ]]; then
  maker_policies=$(call_api "/accounts/$ACCOUNT_ID/access/apps/$maker_app_id/policies")
  maker_policy_id=$(echo "$maker_policies" | jq -r '.result[0].id' | head -n 1)
  ensure_import "cloudflare_zero_trust_access_policy.maker_policy" "accounts/$ACCOUNT_ID/$maker_app_id/$maker_policy_id"
fi

echo "[ensure-imports] Import check complete"

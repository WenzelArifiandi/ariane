#!/usr/bin/env bash
set -euo pipefail

# Proxmox API auth preflight
# Tries API Token first (recommended), then optional user/password.
# Sources values from TF_VAR_* envs or PM_* fallbacks.
#
# Supported envs:
#   TF_VAR_proxmox_api_url
#   TF_VAR_proxmox_api_token_id
#   TF_VAR_proxmox_api_token_secret
#   TF_VAR_proxmox_user
#   TF_VAR_proxmox_password
#   PM_API_URL, PM_API_TOKEN_ID, PM_API_TOKEN_SECRET, PM_USER, PM_PASSWORD (fallbacks)

API_URL=${TF_VAR_proxmox_api_url:-${PM_API_URL:-}}
TOKEN_ID=${TF_VAR_proxmox_api_token_id:-${PM_API_TOKEN_ID:-}}
TOKEN_SECRET=${TF_VAR_proxmox_api_token_secret:-${PM_API_TOKEN_SECRET:-}}
PM_USER=${TF_VAR_proxmox_user:-${PM_USER:-}}
PM_PASS=${TF_VAR_proxmox_password:-${PM_PASSWORD:-}}

if [[ -z "${API_URL}" ]]; then
  echo "❌ Missing API URL. Set TF_VAR_proxmox_api_url or PM_API_URL (e.g., https://54.39.102.214:8006/api2/json)" >&2
  exit 1
fi

trim() { awk '{$1=$1;print}'; }
result_code=""

echo "🔐 Proxmox auth preflight"
echo "🌐 API: ${API_URL}"

if [[ -n "${TOKEN_ID}" && -n "${TOKEN_SECRET}" ]]; then
  echo "➡️  Trying API Token auth (recommended)..."
  # Header format consistent with docs in repo
  AUTH_HEADER="Authorization: PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}"
  result_code=$(curl --connect-timeout 30 --max-time 60 -s -o /dev/null -w "%{http_code}" -k -H "$AUTH_HEADER" "${API_URL%/}/version" || true)
  echo "   GET /version -> HTTP ${result_code}"
  if [[ "$result_code" == "200" ]]; then
    nodes=$(curl --connect-timeout 30 --max-time 60 -s -k -H "$AUTH_HEADER" "${API_URL%/}/nodes" || true)
    # Print minimal info without requiring jq
    echo "   Nodes: $(echo "$nodes" | tr -d '\n' | sed -E 's/\s+/ /g' | cut -c1-200) ..."
    echo "✅ Token auth OK"
    exit 0
  else
    echo "⚠️  Token auth failed (HTTP ${result_code})."
  fi
fi

if [[ -n "${PM_USER}" && -n "${PM_PASS}" ]]; then
  echo "➡️  Trying username/password auth (fallback)..."
  # Obtain auth ticket
  ticket_json=$(curl --connect-timeout 30 --max-time 60 -s -k -X POST "${API_URL%/}/access/ticket" \
    -d "username=${PM_USER}&password=${PM_PASS}" || true)
  ticket=$(echo "$ticket_json" | sed -n 's/.*"ticket":"\([^"]*\)".*/\1/p')
  if [[ -n "$ticket" ]]; then
    result_code=$(curl --connect-timeout 30 --max-time 60 -s -o /dev/null -w "%{http_code}" -k \
      -b "PVEAuthCookie=${ticket}" "${API_URL%/}/version" || true)
    echo "   GET /version -> HTTP ${result_code}"
    if [[ "$result_code" == "200" ]]; then
      echo "✅ Username/password auth OK"
      exit 0
    fi
  fi
  echo "❌ Username/password auth failed."
fi

echo "❌ Authentication failed. Set TF_VAR_proxmox_api_token_id and TF_VAR_proxmox_api_token_secret (recommended), or TF_VAR_proxmox_user and TF_VAR_proxmox_password."
exit 1

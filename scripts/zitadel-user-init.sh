#!/usr/bin/env bash
# Initialize a ZITADEL user by creating an invite code or setting an initial password.
# Works with v2 API; will attempt v1 fallback if needed.
#
# Usage:
#   Z_DOMAIN=auth.wenzelarifiandi.com \
#   Z_TOKEN=$(cat ~/.config/zitadel/pat.txt) \
#   ./scripts/zitadel-user-init.sh invite-code <USER_ID>
#
#   Z_DOMAIN=auth.wenzelarifiandi.com Z_TOKEN=... \
#   ./scripts/zitadel-user-init.sh set-password <USER_ID> '<StrongPass>'
#
# Requirements:
#   - curl, jq
#   - Z_TOKEN: Bearer token with management rights (PAT or client credentials)
#   - Z_DOMAIN: your Zitadel domain (no scheme)

set -euo pipefail

MODE=${1:-}
USER_ID=${2:-}
PASSWORD=${3:-}

if [[ -z "${MODE}" || -z "${USER_ID}" ]]; then
  echo "Usage: Z_DOMAIN=... Z_TOKEN=... $0 {invite-code|set-password} <USER_ID> [PASSWORD]" >&2
  exit 1
fi

: "${Z_DOMAIN:?Z_DOMAIN is required (e.g., auth.wenzelarifiandi.com)}"
: "${Z_TOKEN:?Z_TOKEN is required (Bearer PAT or client credentials token)}"

api_v2() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" \
      -H "Authorization: Bearer ${Z_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "https://${Z_DOMAIN}${path}"
  else
    curl -fsS -X "$method" \
      -H "Authorization: Bearer ${Z_TOKEN}" \
      -H "Content-Type: application/json" \
      "https://${Z_DOMAIN}${path}"
  fi
}

api_v1() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" \
      -H "Authorization: Bearer ${Z_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "https://${Z_DOMAIN}${path}"
  else
    curl -fsS -X "$method" \
      -H "Authorization: Bearer ${Z_TOKEN}" \
      -H "Content-Type: application/json" \
      "https://${Z_DOMAIN}${path}"
  fi
}

case "$MODE" in
  invite-code)
    echo "→ Creating invite/init code for user ${USER_ID} (v2)" >&2
    if api_v2 POST "/api/v2/users/${USER_ID}/invite_code" | jq '.'; then
      echo "✅ Invite code created (v2)" >&2
      exit 0
    else
      echo "⚠️  v2 invite_code failed, trying v1 fallback..." >&2
      # Some older versions: POST /management/v1/users/{userId}/init with optional body
      if api_v1 POST "/management/v1/users/${USER_ID}/init" '{"send_code": false}' | jq '.'; then
        echo "✅ Invite code created (v1)" >&2
        exit 0
      fi
    fi
    ;;
  set-password)
    if [[ -z "${PASSWORD}" ]]; then
      echo "PASSWORD required for set-password" >&2
      exit 1
    fi
    echo "→ Setting initial password for user ${USER_ID} (v2)" >&2
    if api_v2 PATCH "/api/v2/users/${USER_ID}" "{\"password\": \"${PASSWORD}\"}" | jq '.'; then
      echo "✅ Password set (v2)" >&2
      exit 0
    else
      echo "⚠️  v2 set password failed, trying v1 fallback..." >&2
      if api_v1 POST "/management/v1/users/${USER_ID}/password" "{\"password\": \"${PASSWORD}\"}" | jq '.'; then
        echo "✅ Password set (v1)" >&2
        exit 0
      fi
    fi
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    exit 1
    ;;
 esac

echo "❌ All attempts failed. Check token scope/rights and ZITADEL version." >&2
exit 1

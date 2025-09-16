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
#   # New: by email helpers
#   Z_DOMAIN=... Z_TOKEN=... ./scripts/zitadel-user-init.sh find-id 'user@example.com'
#   Z_DOMAIN=... Z_TOKEN=... ./scripts/zitadel-user-init.sh invite-by-email 'user@example.com'
#   Z_DOMAIN=... Z_TOKEN=... ./scripts/zitadel-user-init.sh set-password-by-email 'user@example.com' '<StrongPass>'
#
# Requirements:
#   - curl, jq
#   - Z_TOKEN: Bearer token with management rights (PAT or client credentials)
#   - Z_DOMAIN: your Zitadel domain (no scheme)

set -euo pipefail

MODE=${1:-}
ARG1=${2:-}
ARG2=${3:-}

if [[ -z "${MODE}" ]]; then
  echo "Usage: Z_DOMAIN=... Z_TOKEN=... $0 {invite-code|set-password|find-id|invite-by-email|set-password-by-email} <ARGs>" >&2
  exit 1
fi

: "${Z_DOMAIN:?Z_DOMAIN is required (e.g., auth.wenzelarifiandi.com)}"
: "${Z_TOKEN:?Z_TOKEN is required (Bearer PAT or client credentials token)}"

api_call() {
  local method="$1" path="$2" body="${3:-}"; shift 3 || true
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

find_user_id_by_email() {
  local email="$1"
  # Try v2 search candidate endpoints first
  # 1) POST /api/v2/users/_search {"query": {"email": "..."}}
  if resp=$(api_call POST "/api/v2/users/_search" "{\"query\":{\"email\":\"${email}\"}}" 2>/dev/null); then
    uid=$(echo "$resp" | jq -r '(.users // .result // []) | (.[0].id // empty)')
    if [[ -n "${uid}" ]]; then echo "$uid"; return 0; fi
  fi
  # 2) GET /api/v2/users?email=...
  if resp=$(api_call GET "/api/v2/users?email=$(printf %s "$email" | jq -sRr @uri)" "" 2>/dev/null); then
    uid=$(echo "$resp" | jq -r '(.users // .result // []) | (.[0].id // empty)')
    if [[ -n "${uid}" ]]; then echo "$uid"; return 0; fi
  fi
  # Fallbacks to v1
  # 3) POST /management/v1/users/_search {"query": {"email": "..."}}
  if resp=$(api_call POST "/management/v1/users/_search" "{\"query\":{\"email\":\"${email}\"}}" 2>/dev/null); then
    uid=$(echo "$resp" | jq -r '(.users // .result // []) | (.[0].id // empty)')
    if [[ -n "${uid}" ]]; then echo "$uid"; return 0; fi
  fi
  # 4) POST /management/v1/users/search {"email": "..."}
  if resp=$(api_call POST "/management/v1/users/search" "{\"email\":\"${email}\"}" 2>/dev/null); then
    uid=$(echo "$resp" | jq -r '(.users // .result // []) | (.[0].id // empty)')
    if [[ -n "${uid}" ]]; then echo "$uid"; return 0; fi
  fi
  return 1
}

case "$MODE" in
  find-id)
    email="$ARG1"
    if [[ -z "$email" ]]; then echo "email required" >&2; exit 1; fi
    echo "→ Looking up user id for ${email}" >&2
    if uid=$(find_user_id_by_email "$email"); then
      echo "$uid"
      exit 0
    else
      echo "❌ Could not find user by email. Check org and token rights." >&2
      exit 1
    fi
    ;;
  invite-by-email)
    email="$ARG1"
    if [[ -z "$email" ]]; then echo "email required" >&2; exit 1; fi
    echo "→ Looking up user id for ${email}" >&2
    uid=$(find_user_id_by_email "$email")
    echo "→ Creating invite/init code for user ${uid}" >&2
    if api_call POST "/api/v2/users/${uid}/invite_code" | jq '.'; then
      echo "✅ Invite code created (v2)" >&2
      exit 0
    else
      echo "⚠️  v2 invite_code failed, trying v1 fallback..." >&2
      if api_call POST "/management/v1/users/${uid}/init" '{"send_code": false}' | jq '.'; then
        echo "✅ Invite code created (v1)" >&2
        exit 0
      fi
    fi
    ;;
  set-password-by-email)
    email="$ARG1"; password="$ARG2"
    if [[ -z "$email" || -z "$password" ]]; then echo "email and password required" >&2; exit 1; fi
    echo "→ Looking up user id for ${email}" >&2
    uid=$(find_user_id_by_email "$email")
    echo "→ Setting initial password for user ${uid} (v2)" >&2
    if api_call PATCH "/api/v2/users/${uid}" "{\"password\":\"${password}\"}" | jq '.'; then
      echo "✅ Password set (v2)" >&2
      exit 0
    else
      echo "⚠️  v2 set password failed, trying v1 fallback..." >&2
      if api_call POST "/management/v1/users/${uid}/password" "{\"password\":\"${password}\"}" | jq '.'; then
        echo "✅ Password set (v1)" >&2
        exit 0
      fi
    fi
    ;;
  invite-code)
    USER_ID="$ARG1"
    if [[ -z "${USER_ID}" ]]; then
      echo "Usage: $0 invite-code <USER_ID>" >&2
      exit 1
    fi
    echo "→ Creating invite/init code for user ${USER_ID} (v2)" >&2
    if api_call POST "/api/v2/users/${USER_ID}/invite_code" | jq '.'; then
      echo "✅ Invite code created (v2)" >&2
      exit 0
    else
      echo "⚠️  v2 invite_code failed, trying v1 fallback..." >&2
      if api_call POST "/management/v1/users/${USER_ID}/init" '{"send_code": false}' | jq '.'; then
        echo "✅ Invite code created (v1)" >&2
        exit 0
      fi
    fi
    ;;
  set-password)
    USER_ID="$ARG1"; PASSWORD="$ARG2"
    if [[ -z "${USER_ID}" || -z "${PASSWORD}" ]]; then
      echo "Usage: $0 set-password <USER_ID> '<StrongPass>'" >&2
      exit 1
    fi
    echo "→ Setting initial password for user ${USER_ID} (v2)" >&2
    if api_call PATCH "/api/v2/users/${USER_ID}" "{\"password\": \"${PASSWORD}\"}" | jq '.'; then
      echo "✅ Password set (v2)" >&2
      exit 0
    else
      echo "⚠️  v2 set password failed, trying v1 fallback..." >&2
      if api_call POST "/management/v1/users/${USER_ID}/password" "{\"password\": \"${PASSWORD}\"}" | jq '.'; then
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

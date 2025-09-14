#!/usr/bin/env bash

# Updates SPF TXT records on Cloudflare for:
#  - apex: wenzelarifiandi.com
#  - mail subdomain: mail.wenzelarifiandi.com
# Keeps everything else unchanged. Idempotent and safe.

set -euo pipefail

# Allow passing token/zone via flags, env, or .env file.
TOKEN_ARG=""
ZONE_ARG=""
while [[ ${1:-} =~ ^- ]]; do
  case "$1" in
    -t|--token) TOKEN_ARG="${2:-}"; shift 2;;
    -z|--zone)  ZONE_ARG="${2:-}"; shift 2;;
    -h|--help)
      cat <<EOF
Usage: CF_API_TOKEN=... CF_ZONE_NAME=... bash $0
   or: bash $0 -t <token> -z <zone>

Looks for creds in flags, then env, then ops/dns/.env or .env.
EOF
      exit 0;;
    *) echo "error: unknown option $1" >&2; exit 2;;
  esac
done

# Load from .env files if present (non-fatal if missing)
if [[ -f "ops/dns/.env" ]]; then
  # shellcheck disable=SC1091
  source ops/dns/.env
elif [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source .env
fi

ZONE_NAME="${ZONE_ARG:-${CF_ZONE_NAME:-wenzelarifiandi.com}}"
API_TOKEN="${TOKEN_ARG:-${CF_API_TOKEN:-}}"

if [[ -z "${API_TOKEN}" ]]; then
  echo "CF_API_TOKEN not set. You can paste it now (input hidden)." >&2
  read -r -s -p "Enter CF_API_TOKEN: " API_TOKEN; echo
fi
if [[ -z "${API_TOKEN}" ]]; then
  echo "error: please export CF_API_TOKEN with a Cloudflare API Token (DNS:Edit on the zone)" >&2
  echo "hint: https://dash.cloudflare.com/profile/api-tokens -> Create Token -> Edit zone DNS" >&2
  exit 1
fi

# Desired SPF values
APEX_SPF='v=spf1 include:_spf.mx.cloudflare.net include:mailgun.org include:spf.mailjet.com ~all'
MAIL_SPF='v=spf1 include:mailgun.org ~all'
MAILGUN_RUA='mailto:faab1058@dmarc.mailgun.org'

API="https://api.cloudflare.com/client/v4"
HDR=( -H "Authorization: Bearer ${API_TOKEN}" -H "Content-Type: application/json" )

require() { command -v "$1" >/dev/null 2>&1 || { echo "error: missing '$1' (try: brew install $1)" >&2; exit 1; }; }
require jq
require curl

echo "Looking up zone: ${ZONE_NAME}"
ZONE_JSON=$(curl -sS "${API}/zones?name=${ZONE_NAME}&status=active" "${HDR[@]}")

# Handle invalid token or API errors clearly
API_SUCCESS=$(echo "$ZONE_JSON" | jq -r '.success // true')
if [[ "$API_SUCCESS" != "true" ]]; then
  echo "error: Cloudflare API returned an error while listing zones" >&2
  echo "$ZONE_JSON" | jq -r '.errors[]? | "- " + (.message // "unknown error")' >&2 || true
  echo "hint: ensure CF_API_TOKEN is valid and has Zone:DNS:Edit for ${ZONE_NAME}" >&2
  exit 1
fi

ZONE_ID=$(echo "$ZONE_JSON" | jq -r '.result[0].id // empty')
if [[ -z "${ZONE_ID}" || "${ZONE_ID}" == "null" ]]; then
  echo "error: zone not found or not active: ${ZONE_NAME}" >&2
  echo "hint: verify the token is scoped to the correct account and zone name is exact" >&2
  exit 1
fi

upsert_txt_spf() {
  local name="$1"; shift
  local content="$1"; shift

  echo "Upserting SPF TXT for ${name}"
  local list=$(curl -sS "${API}/zones/${ZONE_ID}/dns_records?type=TXT&name=${name}" "${HDR[@]}")
  # Prefer an existing TXT that looks like SPF (starts with v=spf1)
  local rec_id=$(echo "$list" | jq -r '.result[] | select(.content|startswith("v=spf1")) | .id' | head -n1)

  if [[ -n "${rec_id}" ]]; then
    # Update existing SPF TXT
    curl -sS -X PUT "${API}/zones/${ZONE_ID}/dns_records/${rec_id}" \
      "${HDR[@]}" \
      --data "$(jq -n --arg name "$name" --arg content "$content" '{type:"TXT", name:$name, content:$content, ttl:1}')" >/dev/null
    echo "  updated existing SPF record (${rec_id})"
  else
    # Create new SPF TXT
    local create_json=$(curl -sS -X POST "${API}/zones/${ZONE_ID}/dns_records" \
      "${HDR[@]}" \
      --data "$(jq -n --arg name "$name" --arg content "$content" '{type:"TXT", name:$name, content:$content, ttl:1}')")
    rec_id=$(echo "$create_json" | jq -r '.result.id // empty')
    echo "  created new SPF record (${rec_id})"
  fi

  # Dedupe: remove any extra SPF TXT records for this name
  local all_spf_ids
  all_spf_ids=$(curl -sS "${API}/zones/${ZONE_ID}/dns_records?type=TXT&name=${name}" "${HDR[@]}" \
    | jq -r '.result[] | select(.content|startswith("v=spf1")) | .id')
  for id in $all_spf_ids; do
    if [[ "$id" != "$rec_id" ]]; then
      echo "  removing duplicate SPF record ($id)"
      curl -sS -X DELETE "${API}/zones/${ZONE_ID}/dns_records/${id}" "${HDR[@]}" >/dev/null || true
    fi
  done
}

ensure_mx() {
  local name="$1"; shift
  local value="$1"; shift
  local prio="$1"; shift

  local list=$(curl -sS "${API}/zones/${ZONE_ID}/dns_records?type=MX&name=${name}" "${HDR[@]}")
  local exists=$(echo "$list" | jq -r --arg val "$value" --argjson pr "$prio" '.result[] | select(.content==$val and .priority==$pr) | .id' | head -n1)
  if [[ -n "$exists" ]]; then
    echo "MX ${name} -> ${value} (${prio}) already present"
    return 0
  fi
  echo "Creating MX ${name} -> ${value} (${prio})"
  curl -sS -X POST "${API}/zones/${ZONE_ID}/dns_records" \
    "${HDR[@]}" \
    --data "$(jq -n --arg name "$name" --arg content "$value" --argjson pr "$prio" '{type:"MX", name:$name, content:$content, priority:$pr, ttl:1}')" >/dev/null
}

# Update root DMARC record to include Mailgun's rua without changing policy
update_dmarc_rua() {
  local name="_dmarc.${ZONE_NAME}"
  echo "Updating DMARC for ${name} (adding ${MAILGUN_RUA})"

  # Fetch by name (any type), then select a DMARC payload among TXT/DMARC
  local list_any
  list_any=$(curl -sS "${API}/zones/${ZONE_ID}/dns_records?name=${name}&per_page=100" "${HDR[@]}")
  local chosen_id="" chosen_type="" chosen_content=""
  # Prefer TXT with v=DMARC1
  chosen_id=$(echo "$list_any" | jq -r '.result[] | select(.type=="TXT" and (.content|startswith("v=DMARC1"))) | .id' | head -n1)
  if [[ -n "$chosen_id" ]]; then
    chosen_type="TXT"
    chosen_content=$(echo "$list_any" | jq -r --arg id "$chosen_id" '.result[] | select(.id==$id) | .content')
  else
    # Fallback to DMARC type
    chosen_id=$(echo "$list_any" | jq -r '.result[] | select(.type=="DMARC") | .id' | head -n1)
    if [[ -n "$chosen_id" ]]; then
      chosen_type="DMARC"
      chosen_content=$(echo "$list_any" | jq -r --arg id "$chosen_id" '.result[] | select(.id==$id) | .data.value // .content // empty')
    fi
  fi

  if [[ -z "$chosen_id" ]]; then
    echo "  warning: no existing DMARC record found at ${name}; skipping create to avoid unexpected policy changes" >&2
    return 0
  fi

  # Ensure content string starts with v=DMARC1
  if [[ "$chosen_content" != v=DMARC1* ]]; then
    echo "  warning: DMARC record content not recognized, skipping update" >&2
    return 0
  fi

  # If already contains the Mailgun rua, no change
  if echo "$chosen_content" | grep -qi "rua=.*${MAILGUN_RUA}"; then
    echo "  DMARC already includes ${MAILGUN_RUA}"
  else
    local updated="$chosen_content"
    if echo "$updated" | grep -qi 'rua='; then
      local current_rua=$(echo "$updated" | sed -n 's/.*rua=\([^;]*\).*/\1/p')
      local new_rua
      if echo "$current_rua" | tr 'A-Z' 'a-z' | grep -q "$(echo "$MAILGUN_RUA" | tr 'A-Z' 'a-z')"; then
        new_rua="$current_rua"
      else
        new_rua="${current_rua},${MAILGUN_RUA}"
      fi
      updated=$(echo "$updated" | sed "s/rua=[^;]*/rua=${new_rua}/")
    else
      if echo "$updated" | grep -q ';'; then
        updated=$(echo "$updated" | sed "s/^v=DMARC1;/v=DMARC1; rua=${MAILGUN_RUA};/")
      else
        updated="${updated}; rua=${MAILGUN_RUA}"
      fi
    fi

    if [[ "$updated" != "$chosen_content" ]]; then
      local payload
      if [[ "$chosen_type" == "DMARC" ]]; then
        payload=$(jq -n --arg name "$name" --arg value "$updated" '{type:"DMARC", name:$name, data:{value:$value}, ttl:1}')
      else
        payload=$(jq -n --arg name "$name" --arg content "$updated" '{type:"TXT", name:$name, content:$content, ttl:1}')
      fi
      curl -sS -X PUT "${API}/zones/${ZONE_ID}/dns_records/${chosen_id}" \
        "${HDR[@]}" \
        --data "$payload" >/dev/null
      echo "  updated DMARC record (${chosen_id}, type=${chosen_type})"
    else
      echo "  no change needed"
    fi
  fi

  # Remove duplicates for DMARC across both types, keep chosen_id
  local ids_to_check
  ids_to_check=$(echo "$list_any" | jq -r '.result[] | select((.type=="TXT" and (.content|startswith("v=DMARC1"))) or (.type=="DMARC")) | .id')
  for id in $ids_to_check; do
    if [[ "$id" != "$chosen_id" && -n "$id" ]]; then
      echo "  removing duplicate DMARC record ($id)"
      curl -sS -X DELETE "${API}/zones/${ZONE_ID}/dns_records/${id}" "${HDR[@]}" >/dev/null || true
    fi
  done
}

# 1) Update apex SPF
upsert_txt_spf "${ZONE_NAME}" "${APEX_SPF}"

# 2) Update mail subdomain SPF
upsert_txt_spf "mail.${ZONE_NAME}" "${MAIL_SPF}"

# 3) Ensure Mailgun MX pair exists for mail.${ZONE_NAME} (safe no-op if already there)
ensure_mx "mail.${ZONE_NAME}" "mxa.mailgun.org" 10 || true
ensure_mx "mail.${ZONE_NAME}" "mxb.mailgun.org" 10 || true

# 4) Update root DMARC to include Mailgun's rua
update_dmarc_rua

echo "Done. Now send a test from hello@ and check SPF/DKIM/DMARC in Gmail > Show original."

#!/usr/bin/env bash
set -euo pipefail

# Export selected TF_VAR_* envs from a terraform.tfvars file without echoing values.
# Usage: source scripts/tf/export-tfvars-env.sh /absolute/path/to/terraform.tfvars

TFVARS_PATH=${1:-}
if [[ -z "${TFVARS_PATH}" || ! -f "${TFVARS_PATH}" ]]; then
  echo "export-tfvars-env: terraform.tfvars file not found: ${TFVARS_PATH}" >&2
  return 1 2>/dev/null || exit 1
fi

# Normalize whitespace and strip comments, then parse key/value pairs.
while IFS= read -r line; do
  # remove comments
  line="${line%%#*}"
  # trim whitespace
  line="$(printf '%s' "$line" | sed -e 's/^\s\+//' -e 's/\s\+$//')"
  [[ -z "$line" ]] && continue
  [[ "$line" != *"="* ]] && continue

  key="${line%%=*}"
  val="${line#*=}"
  # trim around key/val
  key="$(printf '%s' "$key" | sed -e 's/^\s*//' -e 's/\s*$//')"
  val="$(printf '%s' "$val" | sed -e 's/^\s*//' -e 's/\s*$//')"
  # strip surrounding quotes if present
  val="${val%\"}"
  val="${val#\"}"

  case "$key" in
    proxmox_api_url)
      export TF_VAR_proxmox_api_url="$val" ;;
    proxmox_api_token_id)
      export TF_VAR_proxmox_api_token_id="$val" ;;
    proxmox_api_token_secret)
      export TF_VAR_proxmox_api_token_secret="$val" ;;
    proxmox_user)
      export TF_VAR_proxmox_user="$val" ;;
    proxmox_password)
      export TF_VAR_proxmox_password="$val" ;;
    ssh_public_key)
      export TF_VAR_ssh_public_key="$val" ;;
    *)
      # ignore other keys
      ;;
  esac
done < "$TFVARS_PATH"

unset TFVARS_PATH key val line

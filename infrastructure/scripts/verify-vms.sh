#!/usr/bin/env bash
set -euo pipefail

# Waits for VM IPs from Terraform outputs and verifies SSH/cloud-init readiness.
# Usage: ./scripts/verify-vms.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${SCRIPT_DIR}/../terraform"
KEY_FILE="${ANSIBLE_SSH_KEY:-$HOME/.ssh/id_ed25519}"

echo "[verify] Using SSH key: ${KEY_FILE}"

cd "$TF_DIR"

get_ip() {
  local key="$1"
  terraform output -json 2>/dev/null | awk -v k="$key" 'BEGIN{ip=""} {print} END{}' >/dev/null
  terraform output -json | jq -r ".${key}.value.ip // empty"
}

require_cmd() { command -v "$1" >/dev/null 2>&1 || return 1; }
require_cmd terraform || { echo "Missing required command: terraform" >&2; exit 1; }
jq_present=0
if command -v jq >/dev/null 2>&1; then jq_present=1; fi

terraform init -upgrade -input=false >/dev/null 2>&1 || true

echo "[verify] Discovering VM IPs..."
postgres_ip=""
k8s_ip=""

# Prefer static IPs declared in tfvars if present
TFVARS_FILE="$TF_DIR/terraform.tfvars"
if [[ -f "$TFVARS_FILE" ]]; then
  static_pg=$(sed -n 's/^[[:space:]]*postgres_static_cidr[[:space:]]*=[[:space:]]*"\(.*\)".*/\1/p' "$TFVARS_FILE" | head -n1)
  static_k3s=$(sed -n 's/^[[:space:]]*k8s_static_cidr[[:space:]]*=[[:space:]]*"\(.*\)".*/\1/p' "$TFVARS_FILE" | head -n1)
  if [[ -n "$static_pg" ]]; then postgres_ip=$(printf '%s' "$static_pg" | sed 's#/.*##'); fi
  if [[ -n "$static_k3s" ]]; then k8s_ip=$(printf '%s' "$static_k3s" | sed 's#/.*##'); fi
fi

if [[ -z "$postgres_ip" || -z "$k8s_ip" ]] && [[ $jq_present -eq 1 ]]; then
  for i in {1..12}; do
    postgres_ip=$(terraform output -json 2>/dev/null | jq -r '.postgresql_vm.value.ip // empty' 2>/dev/null || true)
    k8s_ip=$(terraform output -json 2>/dev/null | jq -r '.k8s_vm.value.ip // empty' 2>/dev/null || true)
    if [[ -n "$postgres_ip" && -n "$k8s_ip" ]]; then
      break
    fi
    sleep 10
  done
fi

# Fallback: Proxmox API lookup by VM name when outputs are empty
if [[ -z "$postgres_ip" || -z "$k8s_ip" ]]; then
  echo "[verify] Falling back to Proxmox API to discover VM IPs..."
  API_URL=${TF_VAR_proxmox_api_url:-}
  TOKEN_ID=${TF_VAR_proxmox_api_token_id:-}
  TOKEN_SECRET=${TF_VAR_proxmox_api_token_secret:-}
  # If env vars are missing, parse terraform.tfvars
  if [[ -z "$API_URL" || -z "$TOKEN_ID" || -z "$TOKEN_SECRET" ]]; then
    if [[ -f "$TFVARS_FILE" ]]; then
      API_URL=$(sed -n 's/^[[:space:]]*proxmox_api_url[[:space:]]*=[[:space:]]*"\(.*\)".*/\1/p' "$TFVARS_FILE" | head -n1)
      TOKEN_ID=$(sed -n 's/^[[:space:]]*proxmox_api_token_id[[:space:]]*=[[:space:]]*"\(.*\)".*/\1/p' "$TFVARS_FILE" | head -n1)
      TOKEN_SECRET=$(sed -n 's/^[[:space:]]*proxmox_api_token_secret[[:space:]]*=[[:space:]]*"\(.*\)".*/\1/p' "$TFVARS_FILE" | head -n1)
    fi
  fi
  # Default API_URL if still empty
  [[ -z "$API_URL" ]] && API_URL="https://54.39.102.214:8006/api2/json"
  BASE="${API_URL%/api2/json}"
  AUTH="Authorization: PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}"
  if [[ -n "$TOKEN_ID" && -n "$TOKEN_SECRET" ]]; then
    # Get node name (first node)
    NODE=$(curl -ks -H "$AUTH" "$BASE/api2/json/nodes" | sed -n 's/.*"node":"\([^"]*\)".*/\1/p' | head -n1)
    [[ -z "$NODE" ]] && NODE="neve"
    # Get VMIDs and names
    VMLIST=$(curl -ks -H "$AUTH" "$BASE/api2/json/nodes/$NODE/qemu")
    get_vmid_by_name() { echo "$VMLIST" | sed -n "s/.*{[^}]*\"name\":\"$1\"[^}]*\"vmid\":\([0-9]\+\)[^}]*}.*/\1/p" | head -n1; }
    VMID_DB=$(get_vmid_by_name "db-postgres")
    VMID_K3S=$(get_vmid_by_name "app-k3s")
    # Fetch IPs via guest agent
    get_ip_from_vmid() {
      local vmid="$1"
      [[ -z "$vmid" ]] && return 0
      curl -ks -H "$AUTH" "$BASE/api2/json/nodes/$NODE/qemu/$vmid/agent/network-get-interfaces" \
        | sed -n 's/.*"ip-address":"\([0-9]\{1,3\}\(\.[0-9]\{1,3\}\)\{3\}\)".*/\1/p' \
        | grep -Ev '^127\.' | head -n1
    }
    [[ -z "$postgres_ip" ]] && postgres_ip=$(get_ip_from_vmid "$VMID_DB")
    [[ -z "$k8s_ip" ]] && k8s_ip=$(get_ip_from_vmid "$VMID_K3S")
  fi
fi

# Final fallback: SSH to Proxmox host and use pvesh/qm if API token is unavailable
if [[ -z "$postgres_ip" || -z "$k8s_ip" ]]; then
  echo "[verify] Final fallback: querying Proxmox host via SSH..."
  # Derive host from API_URL
  HOST=$(printf '%s' "$API_URL" | sed -n 's#https\?://\([^:/]*\).*#\1#p')
  [[ -z "$HOST" ]] && HOST="54.39.102.214"
  # Get VMIDs by name
  QMLIST=$(ssh -o BatchMode=yes root@"$HOST" 'qm list' 2>/dev/null || true)
  VMID_DB=$(printf '%s\n' "$QMLIST" | awk '/db-postgres/ {print $1}' | head -n1)
  VMID_K3S=$(printf '%s\n' "$QMLIST" | awk '/app-k3s/ {print $1}' | head -n1)
  get_ip_via_ssh() {
    local vmid="$1"
    [[ -z "$vmid" ]] && return 0
    ssh -o BatchMode=yes root@"$HOST" "pvesh get /nodes/neve/qemu/${vmid}/agent/network-get-interfaces 2>/dev/null | sed -n 's/.*\"ip-address\":\"\([0-9][0-9\.]*\)\".*/\1/p' | grep -Ev '^127\\.' | head -n1" 2>/dev/null
  }
  [[ -z "$postgres_ip" ]] && postgres_ip=$(get_ip_via_ssh "$VMID_DB")
  [[ -z "$k8s_ip" ]] && k8s_ip=$(get_ip_via_ssh "$VMID_K3S")
fi

if [[ -z "$postgres_ip" || -z "$k8s_ip" ]]; then
  echo "[verify] Unable to determine VM IPs (Terraform outputs and API fallback failed)." >&2
  exit 1
fi

echo "[verify] PostgreSQL VM IP: $postgres_ip"
echo "[verify] K3s VM IP:      $k8s_ip"

PROX_HOST=$(sed -n 's/^[[:space:]]*proxmox_host_ip[[:space:]]*=[[:space:]]*"\(.*\)".*/\1/p' "$TFVARS_FILE" | head -n1)
SSH_JUMP=""
if [[ -n "$PROX_HOST" ]]; then SSH_JUMP="-J root@${PROX_HOST}"; fi

wait_ssh() {
  local host="$1"
  echo "[verify] Pinging $host..."
  ping -c1 -W2 "$host" >/dev/null 2>&1 || true
  echo "[verify] Waiting for SSH on $host..."
  for i in {1..60}; do
    if ssh $SSH_JUMP -i "$KEY_FILE" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=5 ubuntu@"$host" 'echo ok' >/dev/null 2>&1; then
      echo "[verify] SSH ready on $host"
      return 0
    fi
    sleep 5
  done
  return 1
}

cloud_init_wait() {
  local host="$1"
  echo "[verify] Waiting for cloud-init to finish on $host..."
  ssh $SSH_JUMP -i "$KEY_FILE" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 ubuntu@"$host" 'sudo cloud-init status --wait || true' || true
}

wait_ssh "$postgres_ip"
cloud_init_wait "$postgres_ip"

wait_ssh "$k8s_ip"
cloud_init_wait "$k8s_ip"

echo "[verify] Both VMs are reachable via SSH and cloud-init has completed."

INV_FILE="${SCRIPT_DIR}/../ansible/inventory/hosts.yml"
if [[ -f "$INV_FILE" ]]; then
  echo "[verify] Updating Ansible inventory at $INV_FILE"
  # Ensure SSH key path uses ed25519
  sed -i '' 's|ansible_ssh_private_key_file: .*|ansible_ssh_private_key_file: ~/.ssh/id_ed25519|g' "$INV_FILE" 2>/dev/null || true
  # Update host IPs for db-postgres and k3s-master
  awk -v pgip="$postgres_ip" -v k8sip="$k8s_ip" '
    BEGIN{in_db=0; in_k3s=0}
    /db-postgres:/ {in_db=1; in_k3s=0}
    /k3s-master:/ {in_db=0; in_k3s=1}
    in_db==1 && /ansible_host:/ { sub(/ansible_host:.*/, "ansible_host: " pgip) }
    in_k3s==1 && /ansible_host:/ { sub(/ansible_host:.*/, "ansible_host: " k8sip) }
    {print}
  ' "$INV_FILE" > "$INV_FILE.tmp" && mv "$INV_FILE.tmp" "$INV_FILE"
  echo "----- inventory/hosts.yml -----"
  sed -n '1,200p' "$INV_FILE"
  echo "-------------------------------"
else
  echo "[verify] Warning: inventory/hosts.yml not found; Terraform should generate it."
fi

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Secrets live in the repo but git-ignored:
ENV_FILE="$(cd .. && pwd)/.env/wasabi.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it with:"
  echo "  WASABI_ACCESS_KEY=..."
  echo "  WASABI_SECRET_KEY=..."
  echo "  WASABI_BUCKET=..."
  echo "  WASABI_ENDPOINT=s3.eu-west-2.wasabisys.com   # or your region"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# Sanity checks
: "${WASABI_ACCESS_KEY:?WASABI_ACCESS_KEY not set}"
: "${WASABI_SECRET_KEY:?WASABI_SECRET_KEY not set}"
: "${WASABI_BUCKET:?WASABI_BUCKET not set}"
: "${WASABI_ENDPOINT:=s3.wasabisys.com}"

# Ensure Ansible exists on PBS (idempotent)
if ! command -v ansible-playbook >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ansible python3-jmespath
fi

# Run the playbook locally on PBS
ANSIBLE_STDOUT_CALLBACK=yaml \
WASABI_ACCESS_KEY="$WASABI_ACCESS_KEY" \
WASABI_SECRET_KEY="$WASABI_SECRET_KEY" \
WASABI_ENDPOINT="$WASABI_ENDPOINT" \
WASABI_BUCKET="$WASABI_BUCKET" \
ansible-playbook -i 'localhost,' -c local ./pbs-wasabi.yml

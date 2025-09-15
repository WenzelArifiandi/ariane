#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DOMAIN="wenzelarifiandi.com" SUBDOMAIN="dev" bash site/scripts/setup-cf-tunnel.sh
# Or via npm script:
#   DOMAIN="wenzelarifiandi.com" SUBDOMAIN="dev" npm --prefix site run cf:setup

NAME="ariane-dev"
PORT=${PORT:-4321}
HOST_IP=${HOST_IP:-127.0.0.1}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Install with: brew install cloudflared" >&2
  exit 1
fi

if [[ -z "${DOMAIN:-}" || -z "${SUBDOMAIN:-}" ]]; then
  echo "Please set DOMAIN and SUBDOMAIN env vars. Example:" >&2
  echo "  DOMAIN=your-domain.tld SUBDOMAIN=dev npm --prefix site run cf:setup" >&2
  exit 1
fi

HOSTNAME="${SUBDOMAIN}.${DOMAIN}"

echo "[cf-setup] Ensuring named tunnel '${NAME}' exists..."
if ! cloudflared tunnel list | awk 'NR>1 {print $2}' | grep -qx "${NAME}"; then
  cloudflared tunnel create "${NAME}"
fi

TUNNEL_ID=$(cloudflared tunnel list | awk -v name="${NAME}" 'NR>1 && $2==name {print $1; exit}')
if [[ -z "${TUNNEL_ID}" ]]; then
  echo "Failed to resolve Tunnel ID for ${NAME}" >&2
  exit 1
fi

CREDS_FILE="${HOME}/.cloudflared/${TUNNEL_ID}.json"
if [[ ! -f "${CREDS_FILE}" ]]; then
  echo "Credentials file not found at ${CREDS_FILE}. Try: cloudflared tunnel login" >&2
  exit 1
fi

CONFIG_PATH="cloudflared/config.yml"
echo "[cf-setup] Writing ${CONFIG_PATH} for hostname ${HOSTNAME} -> http://${HOST_IP}:${PORT}"
mkdir -p "$(dirname "${CONFIG_PATH}")"
cat > "${CONFIG_PATH}" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDS_FILE}

protocol: http2
edge-ip-version: 4

ingress:
  - hostname: ${HOSTNAME}
    service: http://${HOST_IP}:${PORT}
  - service: http_status:404
EOF

echo "[cf-setup] Creating/updating DNS route ${HOSTNAME} for tunnel ${NAME}"
cloudflared tunnel route dns "${NAME}" "${HOSTNAME}" >/dev/null || true

echo "[cf-setup] Done. Next steps:"
echo "  1) Start dev server:    cd site && npm run dev"
echo "  2) Start named tunnel:  npm --prefix site run cf:tunnel:named"
echo "  3) Visit:               https://${HOSTNAME}"

#!/usr/bin/env bash
# Wrapper to open an interactive remediation-oriented SSH session to the Oracle Zitadel host.
# Usage: ./scripts/zitadel-remote-session.sh [user@host] [path]
# Defaults: user=ubuntu host=auth.wenzelarifiandi.com path=zitadel

set -euo pipefail
USER_HOST=${1:-ubuntu@auth.wenzelarifiandi.com}
REMOTE_PATH=${2:-zitadel}
KEY_PATH=${SSH_KEY_PATH:-$HOME/.ssh/oracle_key_correct}

cat <<'BANNER'
============================================================
 🔐 ZITADEL Remote Session Helper
============================================================
This will:
  * SSH to remote host
  * cd into deployment directory
  * Show Docker + compose versions
  * Provide next-step triage commands
------------------------------------------------------------
BANNER

if [ ! -f "$KEY_PATH" ]; then
  echo "[error] SSH key not found at $KEY_PATH (override with SSH_KEY_PATH env var)" >&2
  exit 1
fi

# Compose the remote bootstrap script (heredoc executed on remote)
read -r -d '' REMOTE_BOOTSTRAP <<'EOF'
set -e
cd "$HOME"/'"${REMOTE_PATH}"' 2>/dev/null || { echo "[remote] Directory $HOME/${REMOTE_PATH} not found"; pwd; ls -1; exit 1; }

printf "\n=== Remote Environment Snapshot ===\n"
( docker compose version || docker-compose version || true ) 2>&1 | sed 's/^/[compose] /'
( docker version ) 2>&1 | grep -E 'Version:|Server:' | sed 's/^/[docker] /'

printf "\n=== Zitadel Directory Contents ===\n"; ls -1 | sed 's/^/  - /'

printf "\n=== Suggested Next Commands ===\n"
cat <<'CMDS'
# 1. Collect diagnostics
bash scripts/triage.sh

# 2. (Optional) Remove failing healthcheck BEFORE restart
#   Edit docker-compose.yml -> delete the zitadel healthcheck block

# 3. Restart sequence (non-destructive)
# docker compose down --remove-orphans || true
# docker compose up -d db
# docker compose logs -f db | grep -m1 'database system is ready'
# docker compose up -d zitadel
# docker compose logs --tail=120 zitadel
# docker compose up -d caddy

# 4. Inspect logs quickly
# docker compose ps
# docker compose logs --tail=80 zitadel | grep -i error | tail -n 20

# 5. If KeyError persists: engine restart
# sudo systemctl restart docker

# 6. SMTP block (add to zitadel.yaml if needed, then recreate service)
# DefaultInstance:\n#   SMTPConfiguration:\n#     Host: smtp.resend.com:465\n#     User: resend\n#     Password: ${ZITADEL_SMTP_PASSWORD}\n#     From: hello@notify.wenzelarifiandi.com\n#     TLS: true
CMDS

echo "\n(Type the commands above as needed; you are now in an interactive shell.)"
exec $SHELL -l
EOF

# shellcheck disable=SC2029
ssh -i "$KEY_PATH" -t "$USER_HOST" "REMOTE_PATH='$REMOTE_PATH' bash -s" <<<"$REMOTE_BOOTSTRAP"

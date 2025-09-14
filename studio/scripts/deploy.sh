#!/usr/bin/env bash
set -euo pipefail

HOOK_URL="${STUDIO_DEPLOY_HOOK_URL:-}"

if [ -z "$HOOK_URL" ]; then
  echo "STUDIO_DEPLOY_HOOK_URL not set."
  echo "Set it temporarily with: export STUDIO_DEPLOY_HOOK_URL=\"https://api.vercel.com/v1/integrations/deploy/<HOOK_ID>\""
  echo "Or add it to your shell profile for reuse."
  exit 1
fi

echo "Triggering Studio deploy via Vercel Deploy Hook..."
curl -fsS -X POST "$HOOK_URL"
echo "\nDone."


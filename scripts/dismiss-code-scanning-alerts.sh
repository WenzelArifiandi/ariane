#!/usr/bin/env bash
set -euo pipefail

# Dismiss Code Scanning alerts that are non-actionable noise:
# - All alerts with tool name 'Scorecard' (repository health metrics)
# - All alerts for files under generated directories (studio/dist, site/dist)
#
# Requirements:
# - GitHub CLI (gh) installed and authenticated
# - Repo permissions to manage code scanning alerts
#
# Usage:
#   scripts/dismiss-code-scanning-alerts.sh [owner] [repo]
#   owner/repo inferred from git remote if not provided

OWNER=${1:-}
REPO=${2:-}

if [[ -z "$OWNER" || -z "$REPO" ]]; then
  ORIGIN_URL=$(git config --get remote.origin.url || true)
  if [[ "$ORIGIN_URL" =~ github.com[:/](.+)/(.+)(\.git)?$ ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]%.git}"
  else
    echo "Error: Could not infer owner/repo. Pass explicitly as arguments."
    exit 1
  fi
fi

echo "Target repository: $OWNER/$REPO"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required. See https://cli.github.com/"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install via 'brew install jq' on macOS."
  exit 1
fi

echo "Fetching open code scanning alerts..."
ALERTS_JSON=$(gh api -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/code-scanning/alerts?state=open&per_page=100" --paginate)

dismiss_alert() {
  local number="$1"; shift
  local reason="$1"; shift
  local comment="$1"; shift
  echo "Dismissing alert #$number ... ($reason)"
  gh api -X PATCH -H "Accept: application/vnd.github+json" \
    "/repos/$OWNER/$REPO/code-scanning/alerts/$number" \
    -f state="dismissed" \
    -f dismissed_reason="$reason" \
    -f dismissed_comment="$comment" >/dev/null || true
}

# 1) Dismiss all Scorecard alerts (repo health, not code vulnerabilities)
echo "Processing Scorecard alerts..."
echo "$ALERTS_JSON" | jq -c '.[] | select(.tool.name == "Scorecard") | {number}' | while read -r row; do
  num=$(echo "$row" | jq -r '.number')
  dismiss_alert "$num" "won't_fix" "Scorecard repository health metrics are tracked outside code scanning."
done

# 2) Dismiss alerts for generated build artifacts under studio/dist or site/dist
echo "Processing alerts in generated directories (dist)..."
echo "$ALERTS_JSON" | jq -c '.[] | select(.most_recent_instance.location.path | test("^(studio|site)/dist/")) | {number, path: .most_recent_instance.location.path}' | while read -r row; do
  num=$(echo "$row" | jq -r '.number')
  path=$(echo "$row" | jq -r '.path')
  dismiss_alert "$num" "won't_fix" "Generated build artifact ($path); excluded from analysis."
done

echo "Done. Review the Security > Code scanning page to confirm dismissals."

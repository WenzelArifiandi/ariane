#!/usr/bin/env bash
set -euo pipefail

REF="${VERCEL_GIT_COMMIT_REF:-HEAD}"

# Try parent of current commit
if BASE=$(git rev-parse "${REF}^" 2>/dev/null); then
  :
# Try PR base branch (for preview builds)
elif [ -n "${VERCEL_GIT_PULL_REQUEST_BASE_BRANCH:-}" ] && git rev-parse "origin/${VERCEL_GIT_PULL_REQUEST_BASE_BRANCH}" >/dev/null 2>&1; then
  BASE="origin/${VERCEL_GIT_PULL_REQUEST_BASE_BRANCH}"
# Fallback to main
elif git rev-parse origin/main >/dev/null 2>&1; then
  BASE="origin/main"
else
  echo "No suitable base found; building to be safe."
  exit 1  # build
fi

# List changed files between BASE and current REF
CHANGED="$(git diff --name-only "${BASE}" "${REF}" || true)"

# Build if docs changed (any Markdown anywhere OR anything under constellation/)
if echo "$CHANGED" | grep -E '^constellation/|\.md$' >/dev/null; then
  echo "Docs changed; build required."
  exit 1  # build
fi

echo "No docs changes; skipping build."
exit 0  # skip

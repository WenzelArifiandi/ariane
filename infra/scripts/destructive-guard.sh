#!/usr/bin/env bash
set -euo pipefail

# Require an explicit, manual opt-in file on the host
GUARD_FILE="/root/ALLOW_DESTRUCTIVE"
if [[ ! -f "$GUARD_FILE" ]]; then
  echo "Refusing: $GUARD_FILE not present on target. Create it intentionally to proceed."
  exit 10
fi

# Locate storage-assert.sh next to this script, regardless of CWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSERT_SCRIPT="${SCRIPT_DIR}/storage-assert.sh"
if [[ ! -x "$ASSERT_SCRIPT" ]]; then
  echo "Refusing: can't find executable storage-assert.sh at $ASSERT_SCRIPT"
  exit 12
fi
"$ASSERT_SCRIPT"

# Require an extra confirmation token in env
: "${I_UNDERSTAND:=""}"
if [[ "$I_UNDERSTAND" != "YES_I_UNDERSTAND_THIS_WILL_DESTROY_DATA" ]]; then
  echo "Refusing: set I_UNDERSTAND=YES_I_UNDERSTAND_THIS_WILL_DESTROY_DATA to proceed."
  exit 11
fi

echo "Destructive guard passed. Executing: $*"
exec "$@"
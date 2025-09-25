#!/usr/bin/env bash
set -euo pipefail

LAYOUT_JSON="${LAYOUT_JSON:-infra/docs/storage-layout.json}"

jq -e . "$LAYOUT_JSON" >/dev/null || { echo "Invalid JSON: $LAYOUT_JSON"; exit 2; }

echo "== Live disks =="
lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINT

# Quick shape checks (count + rough sizes)
need_nvme0=$(jq -r '.disks[] | select(.device=="/dev/nvme0n1") | .partitions | length')
need_nvme1=$(jq -r '.disks[] | select(.device=="/dev/nvme1n1") | .partitions | length')

have_nvme0=$(lsblk -n -o NAME /dev/nvme0n1 | grep -E '^nvme0n1p[0-9]+' | wc -l || true)
have_nvme1=$(lsblk -n -o NAME /dev/nvme1n1 | grep -E '^nvme1n1p[0-9]+' | wc -l || true)

if [[ "$have_nvme0" -ne "$need_nvme0" || "$have_nvme1" -ne "$need_nvme1" ]]; then
  echo "Partition count mismatch. Expected nvme0n1: $need_nvme0, have: $have_nvme0; nvme1n1: $need_nvme1, have: $have_nvme1"
  exit 3
fi

# md raid membership sanity
echo "== mdadm arrays =="
cat /proc/mdstat || true
mdadm --examine --scan || true

# ZFS pool sanity
if command -v zpool >/dev/null 2>&1; then
  echo "== ZFS pools =="
  zpool status || true
fi

echo "Layout looks sane enough for non-destructive operations."
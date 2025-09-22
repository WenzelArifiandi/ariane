#!/usr/bin/env bash
set -euo pipefail

# Export every Proxmox VM disk to Wasabi S3-compatible storage.
# Usage (run on the Proxmox host as root):
#   AWS_PROFILE=wasabi AWS_REGION=us-east-1 WASABI_BUCKET=my-bucket \
#     WASABI_ENDPOINT=https://s3.wasabisys.com \
#     ./export_all_vms_to_wasabi.sh

AWS_PROFILE="${AWS_PROFILE:-default}"
AWS_REGION="${AWS_REGION:-us-east-1}"
WASABI_ENDPOINT="${WASABI_ENDPOINT:-https://s3.wasabisys.com}"
WASABI_BUCKET="${WASABI_BUCKET:-your-wasabi-bucket}"
WASABI_PREFIX="${WASABI_PREFIX:-vm-backups}"

STAGING_DIR="${STAGING_DIR:-/root/tmp_vhd}"
MANIFEST="${MANIFEST:-/root/wasabi-migration-manifest.json}"
LOG_FILE="${LOG_FILE:-/root/export_all_vms_to_wasabi.log}"

mkdir -p "$STAGING_DIR"
rm -f "$MANIFEST" "$LOG_FILE"
touch "$LOG_FILE"

exec >>"$LOG_FILE" 2>&1

echo "[$(date -Iseconds)] Starting export"

cat >"$MANIFEST" <<EOF_JSON
{
  "export_time": "$(date -Iseconds)",
  "bucket": "$WASABI_BUCKET",
  "endpoint": "$WASABI_ENDPOINT",
  "objects": [
EOF_JSON

FIRST_OBJECT=1

mapfile -t VM_IDS < <(qm list | awk 'NR>1 {print $1}' | sort -n)

for VMID in "${VM_IDS[@]}"; do
  [[ -z "$VMID" ]] && continue

  VM_NAME=$(qm config "$VMID" | awk -F': ' '/^name:/ {print $2}' | tr ' ' '_' | tr -cd '[:alnum:]_-')
  [[ -z "$VM_NAME" ]] && VM_NAME="vm${VMID}"

  echo "[$(date -Iseconds)] Processing VMID $VMID ($VM_NAME)"

  mapfile -t DISKS < <(qm config "$VMID" | awk -F '[ :,]+' '/^(scsi|ide)[0-9]+:/ {print $2":"$3}')
  if [[ ${#DISKS[@]} -eq 0 ]]; then
    echo "  No disks detected for VMID $VMID, skipping"
    continue
  fi

  INDEX=0
  for ENTRY in "${DISKS[@]}"; do
    STORAGE=${ENTRY%%:*}
    RELPATH=${ENTRY#*:}

    if [[ "$STORAGE" == "local-lvm" || -z "$RELPATH" ]]; then
      echo "  Disk stored on $STORAGE (likely LVM/ceph). Manual export required. Skipping."
      continue
    fi

    if [[ "$RELPATH" != *.qcow2 && "$RELPATH" != *.raw && "$RELPATH" != *.vmdk ]]; then
      echo "  Unsupported disk format path $RELPATH. Skipping."
      continue
    fi

    SOURCE="/var/lib/vz/images/${RELPATH}"
    if [[ ! -f "$SOURCE" ]]; then
      echo "  Disk file $SOURCE not found. Skipping."
      continue
    fi

    VHD_FILE="${STAGING_DIR}/${VM_NAME}-${VMID}-disk${INDEX}.vhd"
    KEY="${WASABI_PREFIX}/${VM_NAME}-${VMID}-disk${INDEX}.vhd"

    echo "  Converting $SOURCE -> $VHD_FILE"
    qemu-img convert -p -O vpc "$SOURCE" "$VHD_FILE"

    echo "  Uploading to s3://$WASABI_BUCKET/$KEY"
    AWS_PAGER="" AWS_PROFILE="$AWS_PROFILE" AWS_DEFAULT_REGION="$AWS_REGION" \
      aws --endpoint-url "$WASABI_ENDPOINT" s3 cp "$VHD_FILE" "s3://$WASABI_BUCKET/$KEY"

    rm -f "$VHD_FILE"

    if [[ $FIRST_OBJECT -eq 0 ]]; then
      echo "," >>"$MANIFEST"
    fi
    FIRST_OBJECT=0

    cat >>"$MANIFEST" <<EOF_JSON
    { "vmid": "$VMID", "name": "$VM_NAME", "disk_index": $INDEX, "key": "$KEY" }
EOF_JSON

    INDEX=$((INDEX+1))
  done

done

cat >>"$MANIFEST" <<EOF_JSON
  ]
}
EOF_JSON

echo "[$(date -Iseconds)] Export complete. Manifest: $MANIFEST"
exit 0

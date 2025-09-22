#!/usr/bin/env bash
set -euo pipefail

# Export k3s kubeconfig for Lens from the k3s master node
OUT=${1:-$HOME/k3s.yaml}

if [[ $EUID -ne 0 ]]; then
  echo "This script reads /etc/rancher/k3s/k3s.yaml; re-run with sudo or pre-copy the file." >&2
  exit 1
fi

cp /etc/rancher/k3s/k3s.yaml "$OUT"
chown $(logname):$(id -gn $(logname)) "$OUT"

NODE_IP=$(hostname -I | awk '{print $1}')
# Replace the server address from 127.0.0.1 to the node IP
sed -i "s#127.0.0.1#$NODE_IP#g" "$OUT"

echo "Kubeconfig exported to: $OUT"
echo "Import this file into Lens: File -> Add Cluster -> Kubeconfig"

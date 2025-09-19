#!/usr/bin/env bash
set -euo pipefail

# Creates vmbr1 (10.98.0.1/24) on Proxmox with NAT to the public interface.
# Safe to run multiple times (idempotent-ish). Requires root on Proxmox.

BRIDGE=${BRIDGE:-vmbr1}
CIDR=${CIDR:-10.98.0.1/24}
PUBLIC_IF=${PUBLIC_IF:-$(ip route get 1.1.1.1 | awk '/dev/ {for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}')}

echo "Configuring ${BRIDGE} with ${CIDR}, NAT via ${PUBLIC_IF}"

CFG_FILE="/etc/network/interfaces.d/${BRIDGE}.cfg"
if ! grep -q "auto ${BRIDGE}" /etc/network/interfaces /etc/network/interfaces.d/*.cfg 2>/dev/null; then
cat > "$CFG_FILE" <<EOF
auto ${BRIDGE}
iface ${BRIDGE} inet static
    address ${CIDR}
    bridge_ports none
    bridge_stp off
    bridge_fd 0
EOF
  ifup ${BRIDGE} || true
else
  echo "${BRIDGE} appears to exist; skipping bridge creation."
fi

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1
sed -i 's/^#\?net.ipv4.ip_forward=.*/net.ipv4.ip_forward=1/' /etc/sysctl.conf || true

# Configure NAT (iptables)
if ! iptables -t nat -C POSTROUTING -s 10.98.0.0/24 -o "${PUBLIC_IF}" -j MASQUERADE 2>/dev/null; then
  iptables -t nat -A POSTROUTING -s 10.98.0.0/24 -o "${PUBLIC_IF}" -j MASQUERADE
fi
if ! iptables -C FORWARD -i ${BRIDGE} -o "${PUBLIC_IF}" -j ACCEPT 2>/dev/null; then
  iptables -A FORWARD -i ${BRIDGE} -o "${PUBLIC_IF}" -j ACCEPT
fi
if ! iptables -C FORWARD -i "${PUBLIC_IF}" -o ${BRIDGE} -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null; then
  iptables -A FORWARD -i "${PUBLIC_IF}" -o ${BRIDGE} -m state --state RELATED,ESTABLISHED -j ACCEPT
fi

echo "vmbr1 NAT bridge configured. Attach VMs to ${BRIDGE} and use gateway 10.98.0.1."

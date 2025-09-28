#!/bin/bash
# Print VM and LXC memory usage from Proxmox

NODE="$(hostname)"

echo -e "TYPE  ID    NAME                 STATUS   USED(MB)  /  MAX(MB)"
echo "------------------------------------------------------------------"

# VMs
for id in $(qm list | awk 'NR>1 && $3=="running"{print $1}'); do
  j=$(pvesh get /nodes/$NODE/qemu/$id/status/current --output-format json)
  used=$(echo "$j" | jq -r '.mem')
  max=$(echo "$j"  | jq -r '.maxmem')
  stat=$(echo "$j" | jq -r '.status')
  name=$(pvesh get /nodes/$NODE/qemu/$id/config --output-format json | jq -r '.name')
  printf "VM    %-5s %-20s %-7s %8.0f  /  %8.0f\n" \
    "$id" "$name" "$stat" "$(("$used"/1024/1024))" "$(("$max"/1024/1024))"
done

# LXCs
for id in $(pct list | awk 'NR>1 && $2=="running"{print $1}'); do
  j=$(pvesh get /nodes/$NODE/lxc/$id/status/current --output-format json)
  used=$(echo "$j" | jq -r '.mem')
  max=$(echo "$j"  | jq -r '.maxmem')
  stat=$(echo "$j" | jq -r '.status')
  name=$(pvesh get /nodes/$NODE/lxc/$id/config --output-format json | jq -r '.hostname')
  printf "LXC   %-5s %-20s %-7s %8.0f  /  %8.0f\n" \
    "$id" "$name" "$stat" "$(("$used"/1024/1024))" "$(("$max"/1024/1024))"
done
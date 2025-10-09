#!/usr/bin/env bash
set -euo pipefail

#############################
# 🌸 Variables (edit these) #
#############################

# Proxmox / VM identity
VMID=9102
NAME="vscode"
STOR="suvi"             # storage for VM disk + cloudinit
IMAGE_STORAGE="suvi" # storage to hold imported cloud image (can be same as STOR)
SNIPPET_STOR="vesa"      # storage that supports 'snippets' (Datacenter → Storage → local → Snippets ✓)

# Resources
CPU_CORES=8
RAM_MB=32768
DISK_GB=300

# Network
NET_BRIDGE="vmbr1"        # change if your bridge differs

# Cloud image (Ubuntu 24.04 LTS “noble”)
CLOUD_IMAGE_URL="https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
CLOUD_IMAGE="ubuntu-24.04-server-cloudimg-amd64.img"

# Cloud-init login
CIUSER="ubuntu"
CIPASS="seddaw-6jacqi-Xibdik"
SSH_KEY="${HOME}/.ssh/id_ed25519_neve_breakglass.pub"

# Workspace paths inside VM
PROJECTS_DIR="/srv/projects"
CACHES_DIR="/srv/code-caches"

# code-server config
CODE_SERVER_IMAGE="codercom/code-server:latest"
CODE_PORT=8080
CODE_PASSWORD="seddaw-6jacqi-Xibdik"   # put behind Pomerium/Tailscale Serve later
CODE_CPUS=8
CODE_MEM_GB=28
CODE_SWAP_GB=32

# 🔷 Tailscale config
TAILSCALE_ENABLE=true
TAILSCALE_AUTHKEY="tskey-auth-kqSApbuG9t11CNTRL-8YEdgv7Xp8TtJLMbD5cN8TwUupJM7SRE"        # e.g. tskey-auth-XXXXXXXXXX (can be **ephemeral**)
TAILSCALE_HOSTNAME="${NAME}"
TAILSCALE_TAGS="tag:dev,tag:code"
TAILSCALE_SSH=true          # Tailscale SSH for easy access
TAILSCALE_ADVERTISE_EXIT_NODE=false
TAILSCALE_ADVERTISE_ROUTES="" # e.g. "10.10.0.0/16,10.20.0.0/16" (optional)

########################################
# 💠 Prep: downloads & storage checks  #
########################################

SNIPPET_PATH="/var/lib/vz/snippets/${NAME}-cloudinit-user.yml"
mkdir -p "$(dirname "$SNIPPET_PATH")"

IMG_LOCAL="/var/lib/vz/template/iso/${CLOUD_IMAGE}"
if [[ ! -f "$IMG_LOCAL" ]]; then
  echo "🔽 Downloading Ubuntu cloud image..."
  mkdir -p /var/lib/vz/template/iso
  curl -fL "$CLOUD_IMAGE_URL" -o "$IMG_LOCAL"
fi

########################################
# 📝 Cloud-init user-data (Docker + code-server + Tailscale)
########################################
cat > "$SNIPPET_PATH" <<EOF
#cloud-config
preserve_hostname: true
hostname: ${NAME}

users:
  - name: ${CIUSER}
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    lock_passwd: false
    plain_text_passwd: ${CIPASS}
    ssh_authorized_keys:
      - $(cat "${SSH_KEY}")

package_update: true
package_upgrade: true

write_files:
  - path: /etc/systemd/system/code-server-docker.service
    permissions: "0644"
    owner: root:root
    content: |
      [Unit]
      Description=code-server via Docker
      After=network-online.target docker.service
      Wants=network-online.target

      [Service]
      Restart=always
      RestartSec=3
      ExecStart=/usr/bin/docker start -a code-server
      ExecStop=/usr/bin/docker stop -t 10 code-server

      [Install]
      WantedBy=multi-user.target

runcmd:
  # Prepare dirs
  - [ bash, -lc, "mkdir -p ${PROJECTS_DIR} ${CACHES_DIR}" ]

  # Docker CE install
  - [ bash, -lc, "apt-get install -y ca-certificates curl gnupg" ]
  - [ bash, -lc, "install -m 0755 -d /etc/apt/keyrings" ]
  - [ bash, -lc, "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg" ]
  - [ bash, -lc, "chmod a+r /etc/apt/keyrings/docker.gpg" ]
  - [ bash, -lc, "echo 'deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo \$VERSION_CODENAME) stable' > /etc/apt/sources.list.d/docker.list" ]
  - [ bash, -lc, "apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io" ]
  - [ bash, -lc, "usermod -aG docker ${CIUSER}" ]

  # Enable IP forwarding (harmless; useful if you later advertise routes)
  - [ bash, -lc, "echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-forward.conf && sysctl -p /etc/sysctl.d/99-forward.conf || true" ]

  # Pull and start code-server
  - [ bash, -lc, "docker pull ${CODE_SERVER_IMAGE}" ]
  - [ bash, -lc, "docker rm -f code-server >/dev/null 2>&1 || true" ]
  - [ bash, -lc, "docker run -d --name code-server -p ${CODE_PORT}:${CODE_PORT} -v ${PROJECTS_DIR}:/home/coder/project -v ${CACHES_DIR}:/home/coder/.cache -e PASSWORD='${CODE_PASSWORD}' --restart unless-stopped --cpus='${CODE_CPUS}' --memory='${CODE_MEM_GB}g' --memory-swap='${CODE_SWAP_GB}g' ${CODE_SERVER_IMAGE} --bind-addr 0.0.0.0:${CODE_PORT}" ]
  - [ bash, -lc, "systemctl daemon-reload && systemctl enable --now code-server-docker" ]

  # 🔷 Install Tailscale (repo + package)
  - [ bash, -lc, "curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/\$(. /etc/os-release && echo \$VERSION_CODENAME).noarmor.gpg | tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null" ]
  - [ bash, -lc, "curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/\$(. /etc/os-release && echo \$VERSION_CODENAME).tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list >/dev/null" ]
  - [ bash, -lc, "apt-get update && apt-get install -y tailscale" ]
  - [ bash, -lc, "systemctl enable --now tailscaled" ]

  # 🔷 Tailscale up (only if enabled)
  - [ bash, -lc, "if ${TAILSCALE_ENABLE}; then \
        TS_FLAGS='--hostname=${TAILSCALE_HOSTNAME}'; \
        if ${TAILSCALE_SSH}; then TS_FLAGS=\"\$TS_FLAGS --ssh\"; fi; \
        if [ -n '${TAILSCALE_TAGS}' ]; then TS_FLAGS=\"\$TS_FLAGS --advertise-tags=${TAILSCALE_TAGS}\"; fi; \
        if ${TAILSCALE_ADVERTISE_EXIT_NODE}; then TS_FLAGS=\"\$TS_FLAGS --advertise-exit-node\"; fi; \
        if [ -n '${TAILSCALE_ADVERTISE_ROUTES}' ]; then TS_FLAGS=\"\$TS_FLAGS --advertise-routes=${TAILSCALE_ADVERTISE_ROUTES}\"; fi; \
        if [ -n '${TAILSCALE_AUTHKEY}' ]; then \
          tailscale up --authkey='${TAILSCALE_AUTHKEY}' \$TS_FLAGS || true; \
        else \
          echo '⚠️  No Tailscale auth key provided. Run: tailscale up --authkey=... ' \"\$TS_FLAGS\"; \
        fi; \
      fi" ]

final_message: "🚀 ${NAME} is ready. code-server on :${CODE_PORT} and Tailscale installed."
EOF

echo "📝 Wrote cloud-init snippet: $SNIPPET_PATH"

########################################
# 🧱 VM create / import / configure     #
########################################

if qm status "${VMID}" >/dev/null 2>&1; then
  echo "ℹ️ VM ${VMID} already exists. Skipping creation. (Use qm destroy ${VMID} to recreate.)"
else
  echo "🧩 Creating VM ${VMID} (${NAME}) ..."
  qm create "${VMID}" \
    --name "${NAME}" \
    --memory "${RAM_MB}" \
    --cores "${CPU_CORES}" \
    --sockets 1 \
    --cpu host \
    --balloon 0 \
    --net0 virtio,bridge="${NET_BRIDGE}" \
    --scsihw virtio-scsi-single

  echo "📥 Importing disk..."
  qm importdisk "${VMID}" "${IMG_LOCAL}" "${IMAGE_STORAGE}"

  echo "🔗 Attaching disk with discard/ssd..."
  qm set "${VMID}" --scsi0 "${IMAGE_STORAGE}:vm-${VMID}-disk-0",discard=on,ssd=1

  echo "➕ Adding cloud-init drive..."
  qm set "${VMID}" --ide2 "${STOR}:cloudinit"

  echo "🧷 Boot order & console..."
  qm set "${VMID}" --boot order=scsi0
  qm set "${VMID}" --serial0 socket --vga serial0

  echo "📏 Resizing disk to ${DISK_GB}G..."
  qm resize "${VMID}" scsi0 "${DISK_GB}G"

  echo "🔐 Cloud-init creds & snippet..."
  qm set "${VMID}" --ciuser "${CIUSER}"
  qm set "${VMID}" --cipassword "${CIPASS}"
  qm set "${VMID}" --sshkeys "${SSH_KEY}"
  qm set "${VMID}" --cicustom "user=${SNIPPET_STOR}:snippets/${NAME}-cloudinit-user.yml"

  echo "▶️ Starting VM..."
  qm start "${VMID}"
fi

echo "✅ Done.
• Watch cloud-init:   qm terminal ${VMID}   (tail -f /var/log/cloud-init-output.log)
• Get IP (DHCP):      qm guest exec ${VMID} -- ip -4 addr show dev ens18 | sed -n 's/ *inet \\([0-9.]*\\).*/\\1/p'
• Tailscale status:   qm terminal ${VMID}  →  tailscale status
• If no auth key yet: tailscale up --authkey=<tskey> --hostname='${TAILSCALE_HOSTNAME}' \\
                      ${TAILSCALE_SSH:+--ssh} ${TAILSCALE_TAGS:+--advertise-tags='${TAILSCALE_TAGS}'} \\
                      ${TAILSCALE_ADVERTISE_EXIT_NODE:+--advertise-exit-node} ${TAILSCALE_ADVERTISE_ROUTES:+--advertise-routes='${TAILSCALE_ADVERTISE_ROUTES}'}
• code-server URL:    http(s)://<tailscale-host-or-proxy>:${CODE_PORT}  (PASS: ${CODE_PASSWORD})
"
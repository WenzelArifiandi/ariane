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
TAILSCALE_AUTHKEY="${TAILSCALE_AUTHKEY:-}"  # SECURITY: Set via environment variable. Generate at: https://login.tailscale.com/admin/settings/keys
TAILSCALE_HOSTNAME="${NAME}"
TAILSCALE_TAGS="tag:dev,tag:code"
TAILSCALE_SSH=true          # Tailscale SSH for easy access
TAILSCALE_ADVERTISE_EXIT_NODE=false
TAILSCALE_ADVERTISE_ROUTES="" # e.g. "10.10.0.0/16,10.20.0.0/16" (optional)

can you explain all of this?
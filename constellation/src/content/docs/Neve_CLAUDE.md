# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a **Proxmox VE 8.3.4** hypervisor host named **neve** running on Linux kernel 6.8.12-8-pve. The system manages both QEMU/KVM virtual machines and LXC containers with ZFS storage backend.

### Infrastructure Purpose

- Proxmox VE host with public IPv4 (51.159.96.140/24) and IPv6 (2001:bc8:1201:722::/64)
- Private network (10.10.10.0/24) for internal VMs/containers with dnsmasq DHCP server
- HAProxy for SNI/Host-based passthrough to cipher VM (cipher.wenzelarifiandi.com)
- Cloudflare Tunnel for secure external access to Proxmox web UI (neve.wenzelarifiandi.com)
- Proxmox Backup Server integration (VM 1201 "etoile" at 10.10.10.2)

### IP Address Allocation (vmbr1 - 10.10.10.0/24)

- **10.10.10.1**: Host gateway (neve)
- **10.10.10.2**: VM 1201 (etoile) - Proxmox Backup Server
- **10.10.10.50**: Container 201 (lune) - Ubuntu privileged container
- **10.10.10.90**: VM 9100 (cipher) - Ubuntu VM with nginx
- **10.10.10.91-99**: Reserved for manually created VMs (e.g., francoise=.91, dhcp-final-test=.92)
- **10.10.10.100-200**: DHCP range (managed by dnsmasq on host)
- **10.10.10.201-254**: Reserved for future static allocations

**Note**: Ubuntu 24.04 cloud-init VMs use static IPs via `ipconfig0` due to systemd-networkd DHCP compatibility issues. Template VM 9000 is configured with `ipconfig0=ip=10.10.10.99/24,gw=10.10.10.1` as a placeholder - override this when cloning VMs with sequential IPs (.91, .92, .93, etc.).

## Virtual Machines & Containers

### QEMU VMs (qm)

- **1200** (debian12-cloud) - Stopped, Debian 12 cloud-init template
- **1201** (etoile) - Running, 4GB RAM, Proxmox Backup Server on vmbr1
- **9000** (ubuntu-2404-template) - Stopped, Ubuntu 24.04 template
- **9100** (cipher) - Running, 4GB RAM, Ubuntu with cloud-init on 10.10.10.90/24, IPv6: 2001:bc8:1201:722::90/64

### LXC Containers (pct)

- **200** (atlas) - Running, 512MB RAM, Ubuntu unprivileged container on vmbr0
- **201** (lune) - Running, 4GB RAM, Ubuntu privileged container on 10.10.10.50/24 with FUSE support

## Storage Configuration

Storage backends defined in `/etc/pve/storage.cfg`:

- **local** (dir): `/var/lib/vz` - ISOs, backups, templates, snippets
- **vmdata** (zfspool): `rpool/vmdata` - VM disks and container rootfs (830GB available)
- **etoile** (pbs): Proxmox Backup Server at 10.10.10.2 (currently inactive)

## Network Architecture

Configured in `/etc/network/interfaces`:

- **vmbr0**: Public bridge (DHCP: 51.159.96.140/24, Static IPv6: 2001:bc8:1201:722::1/64) via enp5s0
- **vmbr1**: Private bridge (10.10.10.1/24), internal network for VMs/containers
- **tailscale0**: Tailscale VPN interface (100.94.229.96/32, fd7a:115c:a1e0::bd01:e561/128)

NAT is configured for vmbr0 (51.159.96.0/24) to allow outbound traffic.
IPv6 forwarding is enabled for native IPv6 routing to VMs.

## Common Commands

### VM Management

```bash
# List all VMs
qm list

# Start/stop/reboot VM
qm start <vmid>
qm stop <vmid>
qm reboot <vmid>

# View VM configuration
qm config <vmid>

# Create snapshot
qm snapshot <vmid> <snapshot-name>

# Clone from template with static IP (Ubuntu 24.04)
# IMPORTANT: Always assign a sequential IP from 10.10.10.91-99 range
qm clone 9000 <new-vmid> --name <vm-name> --full
qm set <new-vmid> --ipconfig0 ip=10.10.10.XX/24,gw=10.10.10.1
qm start <new-vmid>

# Example: Create a new VM with IP 10.10.10.93
qm clone 9000 9104 --name my-new-vm --full
qm set 9104 --ipconfig0 ip=10.10.10.93/24,gw=10.10.10.1
qm start 9104
```

### Container Management

```bash
# List all containers
pct list

# Start/stop/reboot container
pct start <ctid>
pct stop <ctid>
pct reboot <ctid>

# View container configuration
pct config <ctid>

# Enter container console
pct enter <ctid>

# Create snapshot
pct snapshot <ctid> <snapshot-name>
```

### Storage Management

```bash
# Check storage status
pvesm status

# List storage content
pvesm list <storage-name>

# List ZFS datasets
zfs list

# Check ZFS pool status
zpool status rpool
```

### Network Management

```bash
# View network configuration
ip addr show
cat /etc/network/interfaces

# Restart networking (careful!)
systemctl restart networking

# View bridge status
brctl show
```

### Service Management

```bash
# Restart Proxmox API services
systemctl restart pveproxy pvedaemon

# Check Cloudflare Tunnel status
systemctl status cloudflared
journalctl -u cloudflared -f

# Check HAProxy status (SNI/Host passthrough proxy)
systemctl status haproxy
journalctl -u haproxy -f

# Check HAProxy stats page
curl http://127.0.0.1:8404/stats

# Restart noVNC for VM 1201
systemctl restart novnc-1201
```

### Backup & Recovery

```bash
# Create backup to local storage
vzdump <vmid> --storage local --mode snapshot

# Create backup to Proxmox Backup Server
vzdump <vmid> --storage etoile --mode snapshot

# List backups
pvesm list local | grep vzdump
```

## Key Configuration Files

- `/etc/pve/qemu-server/*.conf` - VM configurations (cluster-synced)
- `/etc/pve/lxc/*.conf` - Container configurations (cluster-synced)
- `/etc/pve/storage.cfg` - Storage definitions
- `/etc/haproxy/haproxy.cfg` - HAProxy SNI/Host passthrough config for cipher.wenzelarifiandi.com
- `/etc/cloudflared/config.yml` - Cloudflare Tunnel configuration
- `/etc/systemd/system/novnc-1201.service` - noVNC service for VM 1201 with clipboard support
- `/etc/systemd/system/spiceproxy-socat.service` - SPICE proxy TCP forwarder (port 61001)
- `/etc/network/interfaces` - Network bridge and NAT configuration

## Architecture Notes

### Security Considerations

- Mail forwarding configured via `/root/.forward` using `proxmox-mail-forward`
- SSH restricted to specific ciphers (see `/root/.ssh/config`)
- Cloudflare Tunnel provides secure external access to Proxmox UI without exposing it directly
- Certificate auto-renewal handled by `fix-pve-certs.service`
- Proxmox firewall enabled with restrictive INPUT policy (see `/etc/pve/firewall/cluster.fw`)
- Tailscale (100.64.0.0/10) allowed for SSH and Proxmox web access

### Special Service Configurations

- **haproxy.service**: SNI/Host-based passthrough proxy on ports 80/443 (IPv4 & IPv6)
  - Routes traffic for cipher.wenzelarifiandi.com to VM cipher (10.10.10.90:80/443)
  - Does NOT terminate TLS - cipher VM handles Let's Encrypt certificates directly
  - Stats page available at http://127.0.0.1:8404/stats
- **novnc-1201.service**: Provides web-based VNC access to VM 1201 on port 6081 with full clipboard support
- **spiceproxy-socat.service**: TCP forwarder from port 61001 to local SPICE proxy (127.0.0.1:3128)
- **cloudflared.service**: Cloudflare Tunnel connects to tunnel ID `464de2f3-7058-4a1f-9f93-ae8425f0ffbe`

### LXC Container Customizations

- Container 201 (lune) has AppArmor disabled and FUSE device passthrough for privileged operations
- Container 200 (atlas) is unprivileged with nesting and keyctl enabled

### Snapshot Management

VMs and containers have snapshots configured for backup/rollback:

- VM 1201: snapshot "etoile-26-9-2025" with vmstate
- VM 9100: snapshot "C28-9-25-20_27" with vmstate
- Container 200: snapshot "atlas"

## Proxmox API Access

Web UI available at:

- Externally: https://neve.wenzelarifiandi.com (via Cloudflare Tunnel)
- Locally: https://127.0.0.1:8006

API access via `pvesh`:

```bash
# Get node information
pvesh get /nodes/neve/status

# List all VMs
pvesh get /nodes/neve/qemu

# List all containers
pvesh get /nodes/neve/lxc
```

## Development Notes

When modifying system configurations:

- Proxmox cluster config files in `/etc/pve/` are cluster-synchronized (even on single-node)
- Always test HAProxy config before reloading: `haproxy -c -f /etc/haproxy/haproxy.cfg`
- Reload HAProxy gracefully: `systemctl reload haproxy` (zero-downtime reload)
- Backup critical configs before modification: configurations are in `/root/etc-pve.stash/`
- Network changes should be tested carefully to avoid losing remote access
- Cloudflare Tunnel changes require service restart: `systemctl restart cloudflared`
- IPv6 forwarding is enabled system-wide in `/etc/sysctl.conf`

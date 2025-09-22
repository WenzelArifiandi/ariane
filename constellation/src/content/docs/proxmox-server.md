---
title: "Proxmox Bare Metal Server - Detailed Specifications"
description: "# Proxmox Bare Metal Server - Detailed Specifications"
slug: proxmox-server
---

# Proxmox Bare Metal Server - Detailed Specifications

> **Server Name**: `neve` > **Public IP**: `54.39.102.214` > **Provider**: OVH Dedicated Server
> **Installation Date**: September 18, 2025

## 🖥️ Hardware Specifications

### CPU

```
Architecture:          x86_64
CPU(s):               8
Model name:           Intel(R) Xeon(R) CPU E3-1270 v6 @ 3.80GHz
CPU family:           6
Model:                158
Thread(s) per core:   2
Core(s) per socket:   4
Socket(s):            1
CPU max MHz:          4200.0000
CPU min MHz:          800.0000
Virtualization:       VT-x
Features:             fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc art arch_perfmon pebs bts rep_good nopl xtopology nonstop_tsc cpuid aperfmperf pni pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ssse3 sdbg fma cx16 xtpr pdcm pcid sse4_1 sse4_2 x2apic movbe popcnt tsc_deadline_timer aes xsave avx f16c rdrand lahf_lm abm 3dnowprefetch cpuid_fault epb pti ssbd ibrs ibpb stibp tpr_shadow flexpriority ept vpid ept_ad fsgsbase tsc_adjust bmi1 avx2 smep bmi2 erms invpcid mpx rdseed adx smap clflushopt intel_pt xsaveopt xsavec xgetbv1 xsaves dtherm ida arat pln pts hwp hwp_notify hwp_act_window hwp_epp vnmi md_clear flush_l1d arch_capabilities
```

### Memory

```
Total:     64 GiB (62.49 GiB usable)
Used:      1.8 GiB (system + Proxmox)
Free:      60+ GiB available for VMs
Swap:      4 GiB total (2 GiB per drive)
```

### Storage Layout

```
Storage Type:    NVMe SSD
Drive Count:     2x 419.2GB NVMe drives
RAID Config:     Software RAID1 (redundancy)
File Systems:    ext4 (boot/root) + ZFS (data)

Partitions:
├─ nvme0n1p1    EFI System (511MB)
├─ nvme0n1p2    Boot RAID1 (1GB) → /boot
├─ nvme0n1p3    Root RAID1 (32GB) → /
├─ nvme0n1p4    Swap (varies)
├─ nvme0n1p5    ZFS member → data pool
└─ nvme0n1p6    Config partition

├─ nvme1n1p1    EFI System (mirror)
├─ nvme1n1p2    Boot RAID1 (mirror)
├─ nvme1n1p3    Root RAID1 (mirror)
├─ nvme1n1p4    Swap (mirror)
└─ nvme1n1p5    ZFS member → data pool
```

### ZFS Pool

```
Pool Name:       data
Size:           384GB
Allocated:      596KB (virtually empty)
Free:           384GB
Health:         ONLINE
Deduplication:  1.00x (disabled)
Compression:    Available
```

## 🌐 Network Configuration

### Interfaces

```
Interface:  eno1 (active)
MAC:        a4:bf:01:43:ee:86
Speed:      1 Gigabit
State:      UP

Interface:  eno2 (standby)
MAC:        a4:bf:01:43:ee:87
Speed:      1 Gigabit
State:      DOWN (available for bonding/backup)
```

### IP Configuration

```
IPv4:       54.39.102.214/24
Gateway:    54.39.102.254
IPv6:       2607:5300:203:3dd6::1/128
Bridge:     vmbr0 (for VMs)
DNS:        Automatic via DHCP
```

### Network Performance

```
Latency to Google:     1.14ms average
Packet Loss:          0%
Bandwidth:            1 Gbps (theoretical)
Location:             OVH datacenter
```

## 💿 Operating System

### Proxmox VE

```
Version:        9.0.10
Repository ID:  deb1ca707ec72a89
Base OS:        Debian GNU/Linux 13 (trixie)
Kernel:         6.14.11-2-pve
Architecture:   x86_64
```

### System Services

```
pve-cluster:    ✅ Active (cluster filesystem)
pveproxy:       ✅ Active (web interface)
pvedaemon:      ✅ Active (API daemon)
pvestatd:       ✅ Active (statistics daemon)
```

### Storage Pools

```
local:          Local storage (images, backups)
data:           ZFS pool (VMs, containers)
```

## 📊 Resource Allocation Planning

### Available Resources

```
CPU Cores:      8 (reserve 1-2 for host)
RAM:           ~60GB (reserve 2-4GB for host)
Storage:       384GB ZFS (keep under 80% = ~300GB usable)
Network:       1 Gbps shared
```

### Recommended VM Sizing

```
Small VM:      1-2 cores, 1-2GB RAM, 20GB disk
Medium VM:     2-4 cores, 4-8GB RAM, 50GB disk
Large VM:      4-6 cores, 8-16GB RAM, 100GB disk
```

### Container Recommendations

```
Lightweight:   0.5-1 core, 512MB-1GB RAM, 5-10GB disk
Standard:      1-2 cores, 1-2GB RAM, 10-20GB disk
Database:      2-4 cores, 4-8GB RAM, 50GB+ disk
```

## 🔧 Management Access

### SSH Access

```bash
# Primary method
ssh root@54.39.102.214

# With specific key
ssh -i ~/.ssh/id_ed25519 root@54.39.102.214

# Key passphrase: [GitHub secret: SSH_KEY_PASSPHRASE]
```

### Web Interface

```
URL:            https://54.39.102.214:8006
Username:       root
Authentication: Set during OVH installation
Certificate:    Self-signed (browser warning expected)
```

### API Access

```bash
# Using pvesh command-line tool
ssh root@54.39.102.214 "pvesh get /nodes"
ssh root@54.39.102.214 "pvesh get /storage"
ssh root@54.39.102.214 "pvesh get /version"
```

## 🛡️ Security Configuration

### Firewall

```
Status:         Proxmox firewall available
Default:        Proxmox default rules
Recommendation: Configure firewall rules per VM/container
```

### SSH Security

```
Key Type:       ED25519 (modern, secure)
Passphrase:     Required (stored in ssh-agent)
Root Access:    Enabled (standard for Proxmox)
Port:          22 (default)
```

### Updates

```
Repository:     Proxmox VE (stable)
Security:       Automatic security updates recommended
Schedule:       Manual updates preferred for production
```

## 📈 Monitoring & Maintenance

### Health Checks

```bash
# System status
ssh root@54.39.102.214 "hostname && uptime && free -h"

# Proxmox status
ssh root@54.39.102.214 "systemctl status pve-cluster"

# Storage health
ssh root@54.39.102.214 "zpool status && df -h"

# Network status
ssh root@54.39.102.214 "ip addr && ip route"
```

### Log Locations

```
System Logs:        /var/log/syslog
Proxmox Logs:       /var/log/pve/
Cluster Logs:       /var/log/pve-cluster/
VM Logs:           /var/log/qemu-server/
Container Logs:     /var/log/lxc/
```

### Backup Strategy

```
Built-in:       Proxmox Backup Server integration available
Manual:         vzdump command for VM/container backups
External:       Consider off-site backup for critical data
Frequency:      Daily for production, weekly for development
```

## 🚀 Deployment Scenarios

### Ideal Use Cases

```
✅ Multiple isolated development environments
✅ CI/CD runners and build agents
✅ Zitadel authentication service
✅ Database servers (PostgreSQL, Redis, etc.)
✅ Web application hosting
✅ Container orchestration (Docker, Kubernetes)
✅ Network services (reverse proxy, VPN)
✅ Monitoring and logging infrastructure
```

### Performance Expectations

```
VM Boot Time:       30-60 seconds
Container Start:    2-5 seconds
Disk I/O:          Very high (NVMe)
Network I/O:       1 Gbps
CPU Performance:    Excellent (Xeon E3)
Memory:            Abundant (64GB)
```

## Current Status Snapshot (Sept 2025)

- Node `neve` is online and healthy; no QEMU VMs or LXC containers are currently present on the host.
- Verify quickly:

```bash
ssh root@54.39.102.214 "pvesh get /nodes/neve/qemu --output-format json && echo --- && pvesh get /nodes/neve/lxc --output-format json"
# => [] and []
```

- Zitadel is currently serving from a different host/IP. Check where DNS points:

```bash
dig +short auth.wenzelarifiandi.com A | tail -n 1
```

When the k3s master VM is provisioned on `neve`, install operations add‑ons:

```bash
bash scripts/k8s/setup-argo-portainer.sh
sudo bash scripts/k8s/export-kubeconfig-for-lens.sh /home/ubuntu/k3s.yaml
```

---

_Last updated: September 19, 2025_
_Installation: Fresh Proxmox VE 9.0.10_
_Hardware: Intel Xeon E3-1270 v6 | 64GB RAM | 2x 419GB NVMe RAID1_

---

## VM Provisioning and SSH Access

### TL;DR for Gemini
*   **Template name**: doree-ubuntu (VMID 9000).
*   **Goal**: Reliable clones with working networking + SSH, then deploy observability and the rest of the stack.
*   **Networking decision**:
    *   Template is hardened with Netplan (virtio NIC, DHCP enabled), QEMU Guest Agent enabled, OpenSSH enabled.
    *   Cloud-Init is optional: we only attach it when we want Proxmox to inject ipconfig0/SSH keys. Without `ide2: cloudinit`, `ipconfig0` does nothing.
*   **Reality of existing VMs**: 100–103 were originally brought up with cloud-init; some had the `ide2` ISO removed later.
*   **Smoke test disk issue**: Proxmox provider sometimes leaves the cloned disk in `unused0`. We added a post-clone `attach_scsi0` step to force `scsi0`, `boot=order=scsi0`, `scsihw=virtio-scsi-single`.

### Current state
*   **VMs up**:
    *   101 db-postgres → 10.98.0.10/24
    *   102 app-k3s → 10.98.0.11/24
    *   100 etoile-pbs → 10.98.0.12/24
    *   103 smoke clone (OK after reattaching scsi0)
*   **Françoise (VM 200)**: used for observability console. Network works; SSH from Proxmox host works only when a key is present; from the laptop you must use WireGuard or a jump via Proxmox.

### What we expect Gemini to do now
1.  **Stop assuming password auth**. All VMs are key-only by design.
2.  **If a VM needs SSH and has no keys yet**:
    *   **Option A (preferred for ad-hoc fixes)**: attach cloud-init ISO and inject a key once:
        ```bash
        qm set 200 --ide2 local:cloudinit \
          --ipconfig0 ip=10.98.0.200/24,gw=10.98.0.1 \
          --sshkeys /root/.ssh/authorized_keys
        qm stop 200 && qm start 200
        ```
        (Use an existing `authorized_keys` file on the Proxmox host—don’t paste private keys.)
    *   **Option B (template-baked)**: console in and add `authorized_keys` under `/home/ubuntu/.ssh/authorized_keys`, ensure `PermitRootLogin prohibit-password` and `PasswordAuthentication no` (default on Ubuntu cloud images).
3.  **Remember**: `ipconfig0` only works if `ide2` (cloud-init) is present. If we remove `ide2`, the VM falls back to DHCP via Netplan (as baked into the template).
4.  **Smoke test reliability**: keep the `null_resource attach_scsi0` step after clone to guarantee `scsi0` + `boot=order=scsi0`. Don’t fight the provider’s disk state; just normalize it.
5.  **Observability access**:
    *   **Private/admin path**: connect WireGuard (on Proxmox) and browse http://10.98.0.200:3000 (Grafana) etc.
    *   **Public path**: run `cloudflared` on Françoise to publish selected ports behind Cloudflare Access (no Proxmox port-opens).

### Commands Gemini can run (safe defaults)
*   **Verify VMs and configs**:
    ```bash
    qm list
    qm config 10{0,1,2,3} | egrep '^(name|boot|bootdisk|scsihw|scsi0|unused|agent|ide2|ipconfig0)'
    ```
*   **Reattach a bad clone disk**:
    ```bash
    # If unused0 is present and scsi0 missing:
    qm set 103 --scsihw virtio-scsi-single --scsi0 local:103/vm-103-disk-0.raw --boot order=scsi0
    qm set 103 --delete unused0
    ```
*   **One-time key injection via cloud-init**:
    ```bash
    qm set 200 --ide2 local:cloudinit --ipconfig0 ip=10.98.0.200/24,gw=10.98.0.1 --sshkeys /root/.ssh/authorized_keys
    qm stop 200 && qm start 200
    ```
*   **Jump through Proxmox to a VM** (when 10.98.0.x isn’t routed from the laptop):
    ```bash
    ssh -J root@54.39.102.214 ubuntu@10.98.0.200
    ```

### What not to do
*   Don’t expect `ipconfig0` to work without `ide2: cloudinit`.
*   Don’t rely on passwords; Ubuntu cloud images ship with password auth disabled.
*   Don’t remove the `attach_scsi0` hook until the Proxmox provider stops dropping disks into `unused0`.

### If SSH still fails
*   **From Proxmox host**:
    ```bash
    nc -zv 10.98.0.X 22   # confirm port is open
    qm agent <vmid> ping  # QGA up?
    ```
*   **If host key changed**:
    ```bash
    ssh-keygen -f /root/.ssh/known_hosts -R 10.98.0.X
    ```
*   **If no agent and no key in guest**: attach cloud-init (above) once, then remove it after you’re in.


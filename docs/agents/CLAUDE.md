# Claude Code Instructions & Infrastructure Management

> **⚠️ IMPORTANT**: This document contains SSH access info and server management commands for Claude Code assistance.

## 🔑 Server Access

### Proxmox Server (neve)
```bash
# SSH Access
ssh root@54.39.102.214

# Add SSH key to agent (if needed)
ssh-add ~/.ssh/id_ed25519
# Passphrase: [Stored as GitHub secret SSH_KEY_PASSPHRASE]

# Test connectivity
./scripts/test-proxmox-ssh.sh
```

### Web Interfaces
- **Proxmox Console**: https://54.39.102.214:8006
- **Zitadel Auth**: https://auth.wenzelarifiandi.com/ui/console

## 🛠️ Common Management Tasks

### Server Health Checks
```bash
# System overview
ssh root@54.39.102.214 "hostname && uptime && free -h"

# Proxmox status
ssh root@54.39.102.214 "pvesh get /nodes && systemctl status pve-cluster"

# Storage status
ssh root@54.39.102.214 "df -h && zpool list"
```

### VM/Container Management
```bash
# List VMs and containers
ssh root@54.39.102.214 "pvesh get /nodes/neve/qemu && pvesh get /nodes/neve/lxc"

# Storage pools
ssh root@54.39.102.214 "pvesh get /storage"
```

### Network & Connectivity
```bash
# Network interfaces
ssh root@54.39.102.214 "ip addr show && ip route"

# Test external connectivity
ssh root@54.39.102.214 "ping -c 2 google.com"
```

## 📋 Claude Code Workflows

### When I Ask About Infrastructure
1. **Check server status** - Always verify the server is responsive
2. **Review current setup** - Use health check commands above
3. **Document changes** - Update this file and ops/ docs as needed

### When I Want to Deploy Something
1. **SSH into server** - Use the access commands above
2. **Check resources** - Verify CPU/RAM/disk availability
3. **Plan deployment** - Consider VM vs container vs bare metal
4. **Document setup** - Add new services to infrastructure docs

### When There Are Issues
1. **Gather logs** - System logs, Proxmox logs, service-specific logs
2. **Check resources** - CPU, memory, disk, network
3. **Test connectivity** - Internal and external network
4. **Review recent changes** - Git history, system changes

## 🔧 Infrastructure Scripts

### Available Scripts
- `./scripts/test-proxmox-ssh.sh` - Test SSH connectivity to Proxmox
- `./scripts/zitadel-remote-session.sh` - Zitadel management (existing)
- `./scripts/prepare-ssh-key.sh` - SSH key preparation (existing)

### Script Patterns for Claude
```bash
# Always use error handling
set -euo pipefail

# Always show what you're doing
echo "🔍 Checking server status..."

# Always verify before acting
if ! ssh root@54.39.102.214 "test -f /etc/proxmox-ve/config"; then
    echo "❌ Not a Proxmox server!"
    exit 1
fi
```

## 🏗️ Infrastructure Architecture

### Current Setup
- **Host OS**: Proxmox VE 9.0.10 (Debian 13 base)
- **Hardware**: Bare metal OVH server
- **Storage**: ZFS on RAID1 NVMe drives
- **Network**: Public IPv4 + IPv6 with bridge for VMs

### Planned Deployments
- [ ] Zitadel instance (containerized)
- [ ] Development environment VMs
- [ ] CI/CD runners
- [ ] Monitoring stack

### Resource Allocation
- **Available**: 8 cores, 60GB RAM, 384GB storage
- **Reserved**: System overhead (~2-4GB RAM)
- **VM Planning**: Consider 1-2 GB RAM overhead per VM

## 📝 Notes for Claude

### Server Characteristics
- **Performance**: High-end Xeon, very fast NVMe storage
- **Reliability**: Enterprise hardware, RAID1 redundancy
- **Network**: Excellent connectivity (1.1ms to Google)
- **Uptime**: Fresh install, expect high availability

### Best Practices
- Always backup before major changes
- Use Proxmox built-in backup features
- Monitor resource usage before deployments
- Keep ZFS pool under 80% capacity
- Document all VM/container configurations

### SSH Behavior
- Uses passphrase-protected key
- Key must be added to ssh-agent
- Connection is stable and fast
- Server responds immediately

---

*Last updated: September 19, 2025*
*Server: neve (54.39.102.214)*
*Proxmox VE: 9.0.10*
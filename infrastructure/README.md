# Ariane Cell v0 Infrastructure

Enterprise-grade infrastructure for Zitadel authentication service migration from Oracle Cloud to Proxmox bare metal.

## 📋 Overview

**Cell v0** is a hybrid PostgreSQL + Kubernetes deployment optimized for single-host enterprise workloads:

- **Source**: Oracle Cloud (Ubuntu, 956MB RAM, Docker Compose)
- **Target**: Proxmox VE (neve server, 64GB RAM, 2x NVMe RAID1)
- **Architecture**: PostgreSQL VM + Kubernetes VM with enterprise monitoring
- **Migration**: Zero-downtime with pgBackRest backup/restore

## 🏗️ Cell v0 Architecture

```
Proxmox Host (neve.wenzelarifiandi.com)
├── PostgreSQL VM (db-postgres)
│   ├── Ubuntu 24.04 LTS
│   ├── 4 cores, 12GB RAM, 100GB storage
│   ├── PostgreSQL 16 + pgBackRest + monitoring
│   └── ZFS dataset: 16K recordsize (optimized for DB)
└── Kubernetes VM (k8s-master)
    ├── Ubuntu 24.04 LTS
    ├── 4 cores, 8GB RAM, 40GB storage
    ├── k3s + Helm (nginx-ingress, cert-manager, monitoring)
    ├── Zitadel v2.65.1, Prometheus, Grafana
    └── ZFS dataset: 128K recordsize (optimized for apps)
```

### 🎯 Services Deployed

- **Zitadel**: OIDC/OAuth2 authentication at `auth.wenzelarifiandi.com`
- **PostgreSQL 16**: Enterprise-tuned with automated Backblaze B2 backups
- **Prometheus + Grafana**: Complete monitoring stack with dashboards
- **nginx-ingress + cert-manager**: Load balancing with automatic Let's Encrypt TLS
- **External DNS**: Automatic Cloudflare DNS management

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install required tools
brew install terraform ansible sops age  # macOS
# or apt install terraform ansible  # Ubuntu (install sops/age manually)
```

### 2. Required API Tokens

**Cloudflare API Token** with permissions:
- Zone:Zone:Read
- Zone:DNS:Edit
- Include specific zone: `wenzelarifiandi.com`

**Backblaze B2 Credentials**:
- Bucket: `ariane-postgres-backups`
- Application Key with read/write access

### 3. Configure Secrets

```bash
cd infrastructure/ansible
./scripts/setup-sops.sh  # Generate encryption keys
sops secrets/cell-v0.yml  # Add your API tokens and passwords
```

### 4. Deploy Infrastructure

```bash
cd ../terraform
terraform init
terraform apply  # Creates VMs

# Update inventory with actual IPs
vim ../ansible/inventory/hosts.yml

cd ../ansible
ansible-playbook -i inventory/hosts.yml cell-v0.yml
```

### 5. Update DNS

Point `auth.wenzelarifiandi.com` to the Kubernetes VM IP address.

## 📂 Project Structure

```
infrastructure/
├── terraform/                         # VM provisioning
│   ├── modules/ubuntu-vm/             # Reusable VM module
│   ├── main.tf                        # Cell v0 VMs definition
│   ├── providers.tf                   # Proxmox provider
│   ├── variables.tf                   # Input variables
│   └── outputs.tf                     # VM IPs and connection info
├── ansible/                           # Configuration management
│   ├── roles/
│   │   ├── postgresql/                # Enterprise PostgreSQL + pgBackRest
│   │   ├── k3s/                       # Kubernetes cluster + Helm apps
│   │   └── monitoring/                # Prometheus + Grafana
│   ├── group_vars/all/
│   │   ├── main.yml                   # Main configuration
│   │   ├── zitadel.yml                # Zitadel Helm values
│   │   └── secrets.yml                # Encrypted secrets (SOPS)
│   ├── secrets/cell-v0.yml            # Master secrets file (SOPS)
│   ├── inventory/hosts.yml            # Host definitions
│   ├── cell-v0.yml                    # Main deployment playbook
│   ├── scripts/setup-sops.sh          # SOPS encryption setup
│   ├── .sops.yaml                     # SOPS configuration
│   └── SOPS.md                        # Encryption documentation
└── README.md                          # This file
```

## 🔧 Manual Steps

### 1. Create Ubuntu Template (One-time)

Run on Proxmox server:

```bash
# Download cloud image
wget https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img

# Create template
qm create 9000 --name ubuntu-24.04-template --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0
qm importdisk 9000 ubuntu-24.04-server-cloudimg-amd64.img data
qm set 9000 --scsihw virtio-scsi-pci --scsi0 data:vm-9000-disk-0
qm set 9000 --boot c --bootdisk scsi0
qm set 9000 --ide2 data:cloudinit
qm set 9000 --serial0 socket --vga serial0
qm set 9000 --agent enabled=1
qm template 9000
```

### 2. DNS Update (After Migration)

Update DNS records to point to new server:
```
auth.wenzelarifiandi.com A 54.39.102.214
```

## 🔄 Migration Process

The migration process ensures zero downtime:

1. **Backup Phase**
   - Stop Zitadel on Oracle Cloud (maintenance mode)
   - Create PostgreSQL dump
   - Backup configuration files

2. **Restore Phase**
   - Deploy new infrastructure
   - Restore database to PostgreSQL VM
   - Configure Zitadel with restored data

3. **Cutover Phase**
   - Verify new instance is healthy
   - Update DNS records
   - Monitor and validate

## 📊 Resource Allocation

| Component | Oracle Cloud | Proxmox Target | Improvement |
|-----------|-------------|----------------|-------------|
| CPU       | Shared      | 6 cores total  | Dedicated   |
| RAM       | 956MB       | 12GB total     | 12.5x more |
| Storage   | 45GB        | 120GB total    | 2.7x more  |
| Network   | Shared      | 1Gbps          | Dedicated   |

## 🛠️ Operations

### View Infrastructure
```bash
cd terraform
terraform show
terraform output
```

### Access VMs
```bash
# SSH to VMs (IPs from terraform output)
ssh ubuntu@<postgresql-ip>
ssh ubuntu@<zitadel-ip>
```

### Monitor Services
```bash
cd ansible
ansible all -i inventory/hosts.yml -m shell -a "systemctl status postgresql"
ansible all -i inventory/hosts.yml -m shell -a "docker compose ps"
```

### Logs
```bash
# PostgreSQL logs
ssh ubuntu@<postgresql-ip> "sudo tail -f /var/log/postgresql/postgresql-16-main.log"

# Zitadel logs
ssh ubuntu@<zitadel-ip> "cd /opt/zitadel && docker compose logs -f zitadel"
```

## 🔒 Security Features

- **PostgreSQL**: Optimized for NVMe, configured for Zitadel workload
- **Network**: Firewall rules, internal VM communication
- **TLS**: Automatic HTTPS via Caddy with Let's Encrypt
- **Backup**: ZFS snapshots + database dumps
- **Auth**: SSH key authentication only

## 🚨 Troubleshooting

### Common Issues

**Terraform fails with API error**
```bash
# Check Proxmox API token permissions
curl -k -H "Authorization: PVEAPIToken=root@pam!terraform:your-secret" \
  https://54.39.102.214:8006/api2/json/version
```

**VMs don't get IP addresses**
```bash
# Check cloud-init on VM
ssh ubuntu@<vm-ip> "sudo cloud-init status"
```

**Ansible connectivity issues**
```bash
# Test connectivity
cd ansible
ansible all -i inventory/hosts.yml -m ping
```

**Migration fails**
```bash
# Check Oracle Cloud connectivity
ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com
```

### Recovery

**Rollback migration**
```bash
# Restart Oracle Cloud Zitadel
ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com \
  "cd zitadel && docker-compose up -d zitadel"
```

**Destroy and rebuild**
```bash
./deploy.sh destroy
./deploy.sh apply
```

## 📝 Next Steps After Migration

1. **Verify functionality** - Test all authentication flows
2. **Update monitoring** - Point health checks to new server
3. **Backup strategy** - Configure automated ZFS snapshots
4. **Performance tuning** - Monitor and optimize based on usage
5. **Decommission Oracle** - Clean up old infrastructure

---

**Created**: September 19, 2025
**Target**: Proxmox VE 9.0.10 (neve server)
**Migration**: Oracle Cloud → Bare Metal**
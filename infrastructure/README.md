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

⚠️ **SECURITY: Never commit credentials to Git!**

```bash
cd infrastructure/terraform

# Option 1: Use terraform.tfvars (local development)
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with actual credentials

# Option 2: Use environment variables (recommended for CI/CD)
# Prefer API token auth (recommended):
export TF_VAR_proxmox_api_url="https://54.39.102.214:8006/api2/json"
export TF_VAR_proxmox_api_token_id="root@pam!terraform"
export TF_VAR_proxmox_api_token_secret="<SECRET>"
# Or fallback to user/password:
# export TF_VAR_proxmox_user="root@pam"
# export TF_VAR_proxmox_password="<PASSWORD>"
export TF_VAR_ssh_public_key="$(cat ~/.ssh/id_ed25519.pub)"

cd ../ansible
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

# Optional: Validate Proxmox auth before Terraform
bash ../../scripts/check-proxmox-auth.sh

# Tip: If you're storing creds in terraform.tfvars, the deploy script will
# auto-export TF_VAR_* from it before running. You can also do it manually:
# source ../../scripts/tf/export-tfvars-env.sh $(pwd)/terraform.tfvars
```

## 🔒 Security Best Practices

### GitHub Secrets for CI/CD

Set these repository secrets for automated deployments:

- `PROXMOX_PASSWORD` - Proxmox root password
- `SSH_PUBLIC_KEY` - SSH public key for VM access
- `SSH_PRIVATE_KEY` - SSH private key for Ansible
- `SOPS_AGE_KEY` - AGE key for secrets encryption

### Credential Management

- **terraform.tfvars**: Git-ignored, contains sensitive Terraform variables
- **secrets/cell-v0.yml**: SOPS-encrypted, safe to commit
- **Environment variables**: Preferred for CI/CD pipelines

### 5. Update DNS

Point `auth.wenzelarifiandi.com` to the Kubernetes VM IP address.

### Current state vs target (Sept 2025)

- Current: Proxmox `neve` online, but no QEMU VMs/LXCs present. Zitadel serves from another host/IP.
- Target: Provision `db-postgres` and `k8s-master` VMs on `neve`, deploy Zitadel to k3s, then repoint DNS.

Next steps:

1. `terraform apply` to create VMs on `neve`.
2. Update `ansible/inventory/hosts.yml` with VM IPs.
3. `ansible-playbook -i inventory/hosts.yml cell-v0.yml` to configure DB, k3s, and apps.
4. On `k8s-master`, install add‑ons for operations visibility:
   ```bash
   bash scripts/k8s/setup-argo-portainer.sh
   sudo bash scripts/k8s/export-kubeconfig-for-lens.sh /home/ubuntu/k3s.yaml
   ```
5. Update DNS to the k3s ingress/LoadBalancer IP.

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
| --------- | ------------ | -------------- | ----------- |
| CPU       | Shared       | 6 cores total  | Dedicated   |
| RAM       | 956MB        | 12GB total     | 12.5x more  |
| Storage   | 45GB         | 120GB total    | 2.7x more   |
| Network   | Shared       | 1Gbps          | Dedicated   |

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

## ❗ Terraform 401 Authentication Failure (Proxmox)

If you see:

```
Error: 401 authentication failure
with provider["registry.terraform.io/telmate/proxmox"], in provider "proxmox"
```

Fix it by using Proxmox API Token auth:

1. In Proxmox UI: Datacenter → Permissions → API Tokens → Create token for `root@pam` with ID `terraform`.

2. Create or edit `infrastructure/terraform.tfvars` (do not commit secrets):

```hcl
proxmox_api_url          = "https://54.39.102.214:8006/api2/json"
proxmox_api_token_id     = "root@pam!terraform"
proxmox_api_token_secret = "<SECRET>"
# Optional fallback creds if not using token:
# proxmox_user     = "root@pam"
# proxmox_password = "<PASSWORD>"
```

3. Re-run:

```bash
cd infrastructure/terraform
terraform init -upgrade
terraform apply -auto-approve
```

Provider note: We pinned the `telmate/proxmox` provider to a stable version due to intermittent 401s on `3.0.1-rc1`. If your lockfile references a different version, reinitialize:

```bash
cd infrastructure/terraform
terraform init -upgrade
terraform providers
```

Auth precedence: When API token variables are set, we explicitly null-out `pm_user`/`pm_password` to avoid mixed auth. `deploy.sh` also unsets `TF_VAR_proxmox_user/password` when token envs are present.

Or run the top-level apply which now performs a Proxmox auth preflight and auto-exports TF_VARs from your tfvars if present:

```bash
cd infrastructure
./deploy.sh apply
```

Notes:

- Ensure node time is correct (NTP) to avoid auth issues.
- Self-signed certs are allowed via `pm_tls_insecure = true`.
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
**Migration**: Oracle Cloud → Bare Metal\*\*

#!/bin/bash
set -euo pipefail

# Zitadel Migration Deployment Script
# Usage: ./deploy.sh [plan|apply|destroy|migrate]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"
ANSIBLE_DIR="$SCRIPT_DIR/ansible"

ACTION="${1:-help}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."

    if ! command -v terraform &> /dev/null; then
        error "Terraform not found. Please install Terraform."
    fi

    if ! command -v ansible-playbook &> /dev/null; then
        error "Ansible not found. Please install Ansible."
    fi

    if [[ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]]; then
        error "terraform.tfvars not found. Copy terraform.tfvars.example and configure it."
    fi

    success "Dependencies check passed"
}

setup_proxmox_template() {
    log "Setting up Proxmox VM template..."
    warning "Manual step required: Create Ubuntu 24.04 template in Proxmox"
    echo ""
    echo "Please run these commands on your Proxmox server:"
    echo ""
    echo "# Download Ubuntu cloud image"
    echo "wget https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img"
    echo ""
    echo "# Create VM template"
    echo "qm create 9000 --name ubuntu-24.04-template --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0"
    echo "qm importdisk 9000 ubuntu-24.04-server-cloudimg-amd64.img data"
    echo "qm set 9000 --scsihw virtio-scsi-pci --scsi0 data:vm-9000-disk-0"
    echo "qm set 9000 --boot c --bootdisk scsi0"
    echo "qm set 9000 --ide2 data:cloudinit"
    echo "qm set 9000 --serial0 socket --vga serial0"
    echo "qm set 9000 --agent enabled=1"
    echo "qm template 9000"
    echo ""
    read -p "Press Enter when template is created..."
}

terraform_plan() {
    log "Running Terraform plan..."
    cd "$TERRAFORM_DIR"
    terraform init
    terraform plan -out="plan_$TIMESTAMP.tfplan"
    success "Terraform plan completed"
}

terraform_apply() {
    log "Applying Terraform configuration..."
    cd "$TERRAFORM_DIR"
    terraform init
    terraform apply -auto-approve
    success "Terraform apply completed"

    log "Waiting for VMs to be ready..."
    sleep 30

    log "Terraform outputs:"
    terraform output
}

terraform_destroy() {
    warning "This will destroy all infrastructure!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    if [[ "$confirm" == "yes" ]]; then
        cd "$TERRAFORM_DIR"
        terraform destroy -auto-approve
        success "Infrastructure destroyed"
    else
        log "Destroy cancelled"
    fi
}

ansible_deploy() {
    log "Deploying with Ansible..."
    cd "$ANSIBLE_DIR"

    if [[ ! -f "inventory/hosts.yml" ]]; then
        error "Ansible inventory not found. Run terraform apply first."
    fi

    # Test connectivity
    log "Testing Ansible connectivity..."
    ansible all -i inventory/hosts.yml -m ping

    # Deploy infrastructure
    log "Running Ansible playbook..."
    ansible-playbook -i inventory/hosts.yml playbooks/site.yml

    success "Ansible deployment completed"
}

migrate_data() {
    log "Starting data migration from Oracle Cloud..."
    cd "$ANSIBLE_DIR"

    if [[ ! -f "inventory/hosts.yml" ]]; then
        error "Ansible inventory not found. Deploy infrastructure first."
    fi

    warning "This will stop Zitadel on Oracle Cloud and migrate data!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    if [[ "$confirm" == "yes" ]]; then
        ansible-playbook -i inventory/hosts.yml playbooks/migrate.yml
        success "Migration completed!"

        log "Next steps:"
        echo "1. Test the new Zitadel instance"
        echo "2. Update DNS when ready"
        echo "3. Decommission Oracle Cloud"
    else
        log "Migration cancelled"
    fi
}

show_help() {
    echo "Zitadel Migration Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  plan     - Run Terraform plan"
    echo "  apply    - Deploy infrastructure with Terraform + Ansible"
    echo "  destroy  - Destroy all infrastructure"
    echo "  migrate  - Migrate data from Oracle Cloud"
    echo "  help     - Show this help message"
    echo ""
    echo "Full deployment process:"
    echo "  1. ./deploy.sh plan"
    echo "  2. ./deploy.sh apply"
    echo "  3. ./deploy.sh migrate"
}

main() {
    case "$ACTION" in
        "plan")
            check_dependencies
            terraform_plan
            ;;
        "apply")
            check_dependencies
            setup_proxmox_template
            terraform_apply
            ansible_deploy
            ;;
        "destroy")
            check_dependencies
            terraform_destroy
            ;;
        "migrate")
            check_dependencies
            migrate_data
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

main "$@"
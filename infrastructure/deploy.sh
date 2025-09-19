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

    # terraform.tfvars is optional if TF_VAR_* envs are provided
    if [[ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]]; then
        warning "terraform.tfvars not found. Will rely on TF_VAR_* env vars if set."
    fi

    success "Dependencies check passed"
}

setup_proxmox_template() {
    log "Creating Proxmox VM template automatically..."
    cd "$TERRAFORM_DIR"

    # Initialize Terraform if needed
    terraform init

    # Create only the template first
    log "Building Ubuntu 24.04 template..."
    terraform apply -target=module.ubuntu_template -auto-approve

    if [ $? -eq 0 ]; then
        success "Ubuntu template created successfully!"
    else
        error "Template creation failed! Check Terraform output above."
    fi
}

terraform_plan() {
    log "Running Terraform plan..."
    cd "$TERRAFORM_DIR"
    terraform init
    terraform plan -out="plan_$TIMESTAMP.tfplan"
    success "Terraform plan completed"
}

template_smoke_test() {
    log "Running template smoke test..."
    cd "$TERRAFORM_DIR"

    # Ensure template exists first
    terraform apply -target=module.ubuntu_template -auto-approve

    # Enable smoke test and create VM
    log "Creating smoke test VM..."
    terraform apply -var="enable_smoke_test=true" -target=proxmox_vm_qemu.template_smoke -auto-approve

    # Wait for VM to be ready
    log "Waiting for smoke test VM to boot..."
    sleep 60

    # Run Ansible smoke test
    log "Running Ansible smoke tests..."
    cd "$ANSIBLE_DIR"

    ANSIBLE_HOST_KEY_CHECKING=False \
    ansible-playbook -i "10.98.0.250," -u ubuntu \
      --ssh-common-args='-o StrictHostKeyChecking=no -o ProxyJump=root@54.39.102.214' \
      --private-key ~/.ssh/id_ed25519 \
      playbooks/template-smoke.yml

    if [ $? -eq 0 ]; then
        success "Template smoke test PASSED!"
    else
        error "Template smoke test FAILED! Check template configuration."
    fi

    # Clean up smoke test VM
    log "Cleaning up smoke test VM..."
    cd "$TERRAFORM_DIR"
    terraform destroy -var="enable_smoke_test=true" -target=proxmox_vm_qemu.template_smoke -auto-approve

    success "Template smoke test completed and cleaned up"
}

terraform_apply() {
    log "Applying Terraform configuration..."
    cd "$TERRAFORM_DIR"
    # Export TF_VAR_* from terraform.tfvars if present
    if [[ -f "terraform.tfvars" ]]; then
        # shellcheck disable=SC1091
        source "$SCRIPT_DIR/../scripts/tf/export-tfvars-env.sh" "$TERRAFORM_DIR/terraform.tfvars" || true
    fi

    # If token envs are present, unset user/password envs to prevent mixed auth
    if [[ -n "${TF_VAR_proxmox_api_token_id:-}" && -n "${TF_VAR_proxmox_api_token_secret:-}" ]]; then
        unset TF_VAR_proxmox_user TF_VAR_proxmox_password || true
    fi

    # Run Proxmox auth preflight to fail fast on 401
    if [[ -f "$SCRIPT_DIR/../scripts/check-proxmox-auth.sh" ]]; then
        log "Preflighting Proxmox API auth..."
        if ! bash "$SCRIPT_DIR/../scripts/check-proxmox-auth.sh"; then
            error "Proxmox API authentication failed. See above output. Ensure TF_VAR_proxmox_api_token_id/secret or user/password are set."
        fi
    fi
    terraform init
    terraform apply -auto-approve
    success "Terraform apply completed"

    log "Waiting for VMs to be ready..."
    sleep 30

    log "Terraform outputs:"
    terraform output

    # Verify VMs are reachable and cloud-init finished
    if [[ -f "$SCRIPT_DIR/scripts/verify-vms.sh" ]]; then
        log "Verifying VM readiness (SSH + cloud-init)..."
        bash "$SCRIPT_DIR/scripts/verify-vms.sh" || warning "Verification reported issues; proceeding to Ansible may fail."
    fi
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

# Configure only the Proxmox Backup Server (PBS) host(s)
ansible_deploy_pbs() {
    log "Configuring Proxmox Backup Server (PBS) with Ansible..."
    cd "$ANSIBLE_DIR"

    if [[ ! -f "inventory/hosts.yml" ]]; then
        error "Ansible inventory not found. Run terraform apply first."
    fi

    # Test connectivity to backup group only
    log "Testing Ansible connectivity to backup hosts..."
    ansible backup -i inventory/hosts.yml -m ping

    # Run PBS role playbook
    log "Running Ansible playbook for PBS..."
    ansible-playbook -i inventory/hosts.yml playbooks/pbs.yml

    success "PBS configuration completed"
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
    echo "  plan      - Run Terraform plan"
    echo "  smoke     - Test VM template only (smoke test)"
    echo "  apply     - Deploy infrastructure with Terraform + Ansible (includes smoke test)"
    echo "  apply-pbs|pbs - Configure PBS host(s) only (after inventory exists)"
    echo "  destroy   - Destroy all infrastructure"
    echo "  migrate   - Migrate data from Oracle Cloud"
    echo "  help      - Show this help message"
    echo ""
    echo "Full deployment process:"
    echo "  1. ./deploy.sh plan"
    echo "  2. ./deploy.sh smoke  (optional - test template)"
    echo "  3. ./deploy.sh apply"
    echo "  4. ./deploy.sh migrate"
}

main() {
    case "$ACTION" in
        "plan")
            check_dependencies
            terraform_plan
            ;;
        "smoke")
            check_dependencies
            template_smoke_test
            ;;
        "apply")
            check_dependencies
            setup_proxmox_template
            template_smoke_test
            terraform_apply
            ansible_deploy
            ansible_deploy_pbs
            ;;
        "apply-pbs"|"pbs")
            check_dependencies
            ansible_deploy_pbs
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
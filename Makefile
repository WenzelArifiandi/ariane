# Ariane Infrastructure Management
# GitHub Actions + Environment Secrets + Zero Local State

.PHONY: help plan apply apply-pbs destroy status

help: ## Show available commands
	@echo "Ariane Infrastructure Management (GitHub Actions)"
	@echo ""
	@echo "Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
	@echo ""
	@echo "Requirements:"
	@echo "  - GitHub CLI (gh) authenticated"
	@echo "  - GitHub Environment 'prod' with required secrets"
	@echo ""

plan: ## Run Terraform plan via GitHub Actions
	@echo "🔍 Running Terraform plan..."
	gh workflow run "Proxmox Infrastructure Deployment" -f action=plan
	@echo "✅ Workflow dispatched. Check: gh run list"

apply: ## Deploy full infrastructure (Terraform + Ansible)
	@echo "🚀 Deploying full infrastructure..."
	@echo "⚠️  This will create VMs and configure services"
	@read -p "Continue? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	gh workflow run "Proxmox Infrastructure Deployment" -f action=apply
	@echo "✅ Workflow dispatched. Monitor: gh run watch"

apply-pbs: ## Configure PBS only (requires existing inventory)
	@echo "🔧 Configuring Proxmox Backup Server..."
	gh workflow run "Proxmox Infrastructure Deployment" -f action=apply-pbs
	@echo "✅ Workflow dispatched. Check: gh run list"

destroy: ## Destroy all infrastructure
	@echo "💥 Destroying infrastructure..."
	@echo "⚠️  This will DELETE all VMs and data"
	@read -p "Type 'destroy' to confirm: " confirm && [ "$$confirm" = "destroy" ] || exit 1
	gh workflow run "Proxmox Infrastructure Deployment" -f action=destroy
	@echo "✅ Workflow dispatched. Monitor: gh run watch"

status: ## Check recent workflow runs
	@echo "📊 Recent workflow runs:"
	gh run list --workflow="Proxmox Infrastructure Deployment" --limit=5

logs: ## Show logs from the latest run
	@echo "📋 Latest workflow logs:"
	gh run view --log

watch: ## Watch the latest workflow run
	@echo "👀 Watching latest run..."
	gh run watch

# Quick status check
check-auth:
	@echo "🔐 GitHub CLI authentication:"
	@gh auth status || (echo "❌ Run: gh auth login" && exit 1)
	@echo "✅ GitHub CLI authenticated"

# Setup reminders
setup-help: ## Show setup instructions
	@echo "🏗️  Ariane Infrastructure Setup"
	@echo ""
	@echo "1. GitHub Environment Setup:"
	@echo "   - Go to: Repo → Settings → Environments"
	@echo "   - Create environment: 'prod'"
	@echo "   - Add required secrets (see README)"
	@echo ""
	@echo "2. Required Secrets:"
	@echo "   PROXMOX_API_URL=https://54.39.102.214:8006/api2/json"
	@echo "   PROXMOX_API_TOKEN_ID=gitops@pve!terraform"
	@echo "   PROXMOX_API_TOKEN_SECRET=<token-secret>"
	@echo "   PROXMOX_HOST_IP=54.39.102.214"
	@echo "   PROXMOX_SSH_PRIVATE_KEY=<private-key-content>"
	@echo "   VM_SSH_PUBLIC_KEY=<public-key-content>"
	@echo ""
	@echo "3. Test authentication:"
	@echo "   make check-auth"
	@echo ""
	@echo "4. Run a plan:"
	@echo "   make plan"
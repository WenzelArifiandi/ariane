# Infrastructure Management Makefile
# Provides convenient commands for template testing and deployment

# Configuration
SMOKE_IP ?= $(shell cd terraform 2>/dev/null && terraform output -raw template_smoke_ip 2>/dev/null || printf '10.98.0.250')
PROXMOX_HOST ?= 54.39.102.214
SSH_KEY ?= ~/.ssh/id_ed25519
ANSIBLE_USER ?= ubuntu

# Colors for output
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)Infrastructure Management Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'

# Template smoke testing
.PHONY: smoke-up
smoke-up: ## Create smoke test VM
	@echo "$(BLUE)Creating template smoke test VM...$(RESET)"
	cd terraform && terraform init -input=false
	cd terraform && terraform apply -var="enable_smoke_test=true" -target=proxmox_vm_qemu.template_smoke -auto-approve
	@SMOKE_ACTUAL_IP=$$(cd terraform && terraform output -raw template_smoke_ip 2>/dev/null || printf '%s' '$(SMOKE_IP)'); \
		echo "$(GREEN)✅ Smoke test VM created at $$SMOKE_ACTUAL_IP$(RESET)"

.PHONY: smoke-test
smoke-test: ## Run Ansible smoke tests against the test VM
	@echo "$(BLUE)Running Ansible smoke tests...$(RESET)"
	@sleep 30  # Wait for VM to fully boot
	@SMOKE_ACTUAL_IP=$$(cd terraform && terraform output -raw template_smoke_ip 2>/dev/null || printf '%s' '$(SMOKE_IP)'); \
		cd ansible && ANSIBLE_HOST_KEY_CHECKING=False \
		ansible-playbook -i "$$SMOKE_ACTUAL_IP," -u $(ANSIBLE_USER) \
		--ssh-common-args='-o StrictHostKeyChecking=no -o ProxyJump=root@$(PROXMOX_HOST)' \
		--private-key $(SSH_KEY) \
		playbooks/template-smoke.yml
	@echo "$(GREEN)✅ Smoke tests completed successfully$(RESET)"

.PHONY: smoke-down
smoke-down: ## Destroy smoke test VM
	@echo "$(BLUE)Cleaning up smoke test VM...$(RESET)"
	cd terraform && terraform destroy -var="enable_smoke_test=true" -target=proxmox_vm_qemu.template_smoke -auto-approve
	@echo "$(GREEN)✅ Smoke test VM destroyed$(RESET)"

.PHONY: smoke
smoke: smoke-up smoke-test smoke-down ## Complete smoke test cycle (create, test, destroy)
	@echo "$(GREEN)🎉 Template smoke test completed successfully!$(RESET)"

# Infrastructure deployment
.PHONY: plan
plan: ## Run Terraform plan
	@echo "$(BLUE)Running Terraform plan...$(RESET)"
	./deploy.sh plan

.PHONY: apply
apply: ## Deploy full infrastructure (includes smoke test)
	@echo "$(BLUE)Deploying infrastructure...$(RESET)"
	./deploy.sh apply

.PHONY: apply-pbs
apply-pbs: ## Configure PBS hosts only
	@echo "$(BLUE)Configuring PBS hosts...$(RESET)"
	./deploy.sh apply-pbs

.PHONY: destroy
destroy: ## Destroy all infrastructure
	@echo "$(RED)⚠️  Destroying infrastructure...$(RESET)"
	./deploy.sh destroy

.PHONY: migrate
migrate: ## Migrate data from Oracle Cloud
	@echo "$(BLUE)Starting data migration...$(RESET)"
	./deploy.sh migrate

# Utilities
.PHONY: status
status: ## Show status of deployed VMs
	@echo "$(BLUE)Checking VM status...$(RESET)"
	@ssh root@$(PROXMOX_HOST) "pvesh get /nodes/neve/qemu" | grep -E "(vmid|name|status|uptime)" || true

.PHONY: connect-pbs
connect-pbs: ## SSH to PBS VM
	@echo "$(BLUE)Connecting to PBS VM...$(RESET)"
	ssh -o ProxyJump=root@$(PROXMOX_HOST) $(ANSIBLE_USER)@10.98.0.12

.PHONY: connect-db
connect-db: ## SSH to Database VM
	@echo "$(BLUE)Connecting to Database VM...$(RESET)"
	ssh -o ProxyJump=root@$(PROXMOX_HOST) $(ANSIBLE_USER)@10.98.0.10

.PHONY: connect-k3s
connect-k3s: ## SSH to Kubernetes VM
	@echo "$(BLUE)Connecting to Kubernetes VM...$(RESET)"
	ssh -o ProxyJump=root@$(PROXMOX_HOST) $(ANSIBLE_USER)@10.98.0.11

.PHONY: connect-smoke
connect-smoke: ## SSH to smoke test VM (if running)
	@echo "$(BLUE)Connecting to smoke test VM...$(RESET)"
	SMOKE_ACTUAL_IP=$$(cd terraform && terraform output -raw template_smoke_ip 2>/dev/null || printf '%s' '$(SMOKE_IP)'); \
	ssh -o ProxyJump=root@$(PROXMOX_HOST) $(ANSIBLE_USER)@$$SMOKE_ACTUAL_IP

# Validation and troubleshooting
.PHONY: ping-vms
ping-vms: ## Ping all VMs from Proxmox host
	@echo "$(BLUE)Pinging VMs from Proxmox host...$(RESET)"
	@ssh root@$(PROXMOX_HOST) "echo 'Pinging VMs:' && \
		ping -c 2 10.98.0.10 2>/dev/null && echo '✅ DB VM reachable' || echo '❌ DB VM unreachable' && \
		ping -c 2 10.98.0.11 2>/dev/null && echo '✅ K3s VM reachable' || echo '❌ K3s VM unreachable' && \
		ping -c 2 10.98.0.12 2>/dev/null && echo '✅ PBS VM reachable' || echo '❌ PBS VM unreachable'"

.PHONY: check-agents
check-agents: ## Check QEMU guest agent status on all VMs
	@echo "$(BLUE)Checking QEMU guest agents...$(RESET)"
	@ssh root@$(PROXMOX_HOST) "echo 'QEMU Guest Agent Status:' && \
		qm guest exec 100 -- systemctl is-active qemu-guest-agent 2>/dev/null && echo '✅ PBS agent active' || echo '❌ PBS agent inactive' && \
		qm guest exec 101 -- systemctl is-active qemu-guest-agent 2>/dev/null && echo '✅ DB agent active' || echo '❌ DB agent inactive' && \
		qm guest exec 102 -- systemctl is-active qemu-guest-agent 2>/dev/null && echo '✅ K3s agent active' || echo '❌ K3s agent inactive'"

.PHONY: logs
logs: ## Show recent deployment logs
	@echo "$(BLUE)Recent deployment activity:$(RESET)"
	@ssh root@$(PROXMOX_HOST) "journalctl -u qemu-server@100 --no-pager -n 10 --since='1 hour ago'" 2>/dev/null || echo "No recent logs for PBS VM"
	@ssh root@$(PROXMOX_HOST) "journalctl -u qemu-server@101 --no-pager -n 10 --since='1 hour ago'" 2>/dev/null || echo "No recent logs for DB VM"
	@ssh root@$(PROXMOX_HOST) "journalctl -u qemu-server@102 --no-pager -n 10 --since='1 hour ago'" 2>/dev/null || echo "No recent logs for K3s VM"

# Quick deployment workflow
.PHONY: quick-deploy
quick-deploy: smoke apply ## Quick deployment: smoke test then full apply
	@echo "$(GREEN)🚀 Quick deployment completed!$(RESET)"

# Clean up everything
.PHONY: clean
clean: smoke-down ## Clean up any running smoke test VMs
	@echo "$(GREEN)✅ Cleanup completed$(RESET)"

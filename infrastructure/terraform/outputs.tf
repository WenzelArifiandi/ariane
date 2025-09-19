output "postgresql_vm" {
  description = "PostgreSQL VM information"
  value = {
    id     = module.postgresql_vm.vm_id
    name   = module.postgresql_vm.vm_name
    ip     = module.postgresql_vm.vm_ip
    ssh    = module.postgresql_vm.ssh_host
    specs  = "4 cores, 12GB RAM, 100GB disk on ZFS"
    role   = "database"
  }
}

output "k8s_vm" {
  description = "Kubernetes VM information"
  value = {
    id     = module.k8s_vm.vm_id
    name   = module.k8s_vm.vm_name
    ip     = module.k8s_vm.vm_ip
    ssh    = module.k8s_vm.ssh_host
    specs  = "4 cores, 8GB RAM, 40GB disk on ZFS"
    role   = "kubernetes"
  }
}

output "cell_v0_summary" {
  description = "Cell v0 architecture summary"
  value = {
    architecture = "Hybrid PostgreSQL VM + K8s VM"
    total_resources = {
      vcpus = 8
      memory = "20GB"
      storage = "140GB"
    }
    components = [
      "PostgreSQL 16 with pgBackRest",
      "k3s Kubernetes cluster",
      "Zitadel via Helm",
      "Prometheus + Grafana monitoring",
      "nginx-ingress + cert-manager"
    ]
  }
}

output "access_info" {
  description = "Access information for deployed services"
  value = {
    postgresql = {
      host = module.postgresql_vm.vm_ip
      port = 5432
      ssh  = "ssh ubuntu@${module.postgresql_vm.vm_ip}"
    }
    kubernetes = {
      host = module.k8s_vm.vm_ip
      ssh  = "ssh ubuntu@${module.k8s_vm.vm_ip}"
      kubeconfig = "scp ubuntu@${module.k8s_vm.vm_ip}:~/.kube/config ~/.kube/config-cell-v0"
    }
    zitadel = {
      url = "https://auth.wenzelarifiandi.com"
      note = "Available after Ansible deployment"
    }
    monitoring = {
      prometheus = "http://${module.k8s_vm.vm_ip}:30090"
      grafana = "http://${module.k8s_vm.vm_ip}:30000"
      note = "Available after Ansible deployment"
    }
  }
}

output "next_steps" {
  description = "Next steps after Terraform deployment"
  value = <<-EOT
    🎉 Cell v0 VMs created successfully!

    📋 Architecture:
    • PostgreSQL VM: ${module.postgresql_vm.vm_ip} (4C/12GB/100GB)
    • K8s VM: ${module.k8s_vm.vm_ip} (4C/8GB/40GB)

    🚀 Next Steps:
    1. Configure infrastructure:
       cd ../ansible
       ansible-playbook -i inventory/hosts.yml playbooks/cell-v0.yml

    2. Access services:
       • PostgreSQL: ${module.postgresql_vm.vm_ip}:5432
       • Kubernetes: kubectl --kubeconfig ~/.kube/config-cell-v0 get nodes
       • Zitadel: https://auth.wenzelarifiandi.com (after deployment)

    3. Migration:
       ansible-playbook -i inventory/hosts.yml playbooks/migrate-from-oracle.yml

    🔐 Security:
    • SSH: ssh ubuntu@<vm-ip>
    • Firewall: PostgreSQL only accessible from K8s VM
    • TLS: Let's Encrypt certificates via cert-manager

    📊 Monitoring:
    • Prometheus: Scrapes PostgreSQL + K8s metrics
    • Grafana: Dashboards for both VMs
    • Logs: Centralized via K8s logging
  EOT
}

output "resource_utilization" {
  description = "Resource utilization on Proxmox host"
  value = {
    used = {
      vcpus = "8 of 8 available"
      memory = "20GB of 64GB (31% utilization)"
      storage = "140GB on ZFS pool"
    }
    remaining = {
      vcpus = "0 (all allocated efficiently)"
      memory = "44GB available for future expansion"
      storage = "~240GB remaining on ZFS pool"
    }
    efficiency = "Optimal - room for growth without waste"
  }
}
output "postgresql_vm" {
  description = "PostgreSQL VM information"
  value = {
    id    = module.postgresql_vm.vm_id
    name  = module.postgresql_vm.vm_name
    ip    = var.postgres_ip
    ssh   = module.postgresql_vm.ssh_host
    specs = "4 cores, 12GB RAM, 100GB disk on ZFS"
    role  = "database"
  }
}

output "k8s_vm" {
  description = "Kubernetes VM information"
  value = {
    id    = module.k8s_vm.vm_id
    name  = module.k8s_vm.vm_name
    ip    = var.k8s_ip
    ssh   = module.k8s_vm.ssh_host
    specs = "4 cores, 8GB RAM, 40GB disk on ZFS"
    role  = "kubernetes"
  }
}

output "cell_v0_summary" {
  description = "Cell v0 architecture summary"
  value = {
    architecture = "Hybrid PostgreSQL VM + K8s VM"
    total_resources = {
      vcpus   = 8
      memory  = "20GB"
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
      host = var.postgres_ip
      port = 5432
      ssh  = "ssh ubuntu@${var.postgres_ip}"
    }
    kubernetes = {
      host       = var.k8s_ip
      ssh        = "ssh ubuntu@${var.k8s_ip}"
      kubeconfig = "scp ubuntu@${var.k8s_ip}:~/.kube/config ~/.kube/config-cell-v0"
    }
    zitadel = {
      url  = "https://auth.wenzelarifiandi.com"
      note = "Available after Ansible deployment"
    }
    monitoring = {
      prometheus = "http://${var.k8s_ip}:30090"
      grafana    = "http://${var.k8s_ip}:30000"
      note       = "Available after Ansible deployment"
    }
  }
}

output "next_steps" {
  description = "Next steps after Terraform deployment"
  value       = <<-EOT
    🎉 Cell v0 VMs created successfully!

    📋 Architecture:
    • PostgreSQL VM: ${var.postgres_ip} (4C/12GB/100GB)
    • K8s VM: ${var.k8s_ip} (4C/8GB/40GB)

    🚀 Next Steps:
    1. Configure infrastructure:
       cd ../ansible
       ansible-playbook -i inventory/hosts.yml playbooks/cell-v0.yml

    2. Access services:
       • PostgreSQL: ${var.postgres_ip}:5432
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
      vcpus   = "8 of 8 available"
      memory  = "20GB of 64GB (31% utilization)"
      storage = "140GB on ZFS pool"
    }
    remaining = {
      vcpus   = "0 (all allocated efficiently)"
      memory  = "44GB available for future expansion"
      storage = "~240GB remaining on ZFS pool"
    }
    efficiency = "Optimal - room for growth without waste"
  }
}

# Cloudflare Access Outputs
output "cloudflare_access_application" {
  description = "Cloudflare Access application information"
  value = {
    id     = cloudflare_access_application.cipher.id
    domain = cloudflare_access_application.cipher.domain
    aud    = cloudflare_access_application.cipher.aud
    name   = cloudflare_access_application.cipher.name
  }
  sensitive = false
}

output "cloudflare_access_identity_provider" {
  description = "CIPHER OIDC identity provider information"
  value = {
    id   = cloudflare_access_identity_provider.cipher_oidc.id
    name = cloudflare_access_identity_provider.cipher_oidc.name
    type = cloudflare_access_identity_provider.cipher_oidc.type
  }
  sensitive = false
}

output "cloudflare_access_service_token" {
  description = "Service token for programmatic access"
  value = {
    id           = cloudflare_access_service_token.cipher_service_token.id
    name         = cloudflare_access_service_token.cipher_service_token.name
    client_id    = cloudflare_access_service_token.cipher_service_token.client_id
    client_secret = cloudflare_access_service_token.cipher_service_token.client_secret
  }
  sensitive = true
}

output "cipher_access_info" {
  description = "Complete Cipher access setup information"
  value = {
    application = {
      url    = "https://cipher.wenzelarifiandi.com"
      access = "https://cipher.wenzelarifiandi.com/cdn-cgi/access/login"
    }
    authentication = {
      provider = "CIPHER OIDC"
      issuer   = var.cipher_issuer_url
    }
    policies = [
      "Allow CIPHER Users",
      "Allow Service Token"
    ]
    service_token = {
      usage = "For programmatic API access"
      note  = "Store client_id and client_secret securely"
    }
  }
}

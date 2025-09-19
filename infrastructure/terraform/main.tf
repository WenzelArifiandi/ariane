# Cell v0 - Hybrid PostgreSQL VM + K8s VM Architecture

# PostgreSQL Database VM
module "postgresql_vm" {
  source = "./modules/ubuntu-vm"

  vm_name          = "db-postgres"
  target_node      = var.target_node
  cores            = 4
  memory           = 12288  # 12GB RAM
  disk_size        = "100G"
  storage_pool     = "local"
  ssh_public_key   = var.ssh_public_key
  default_password = "changeme123"
  ip_config        = (var.postgres_static_cidr != "" && var.net_gateway != "") ? "ip=${var.postgres_static_cidr},gw=${var.net_gateway}" : "dhcp"
  bridge           = var.vm_bridge
  tags             = "postgres,database,cell-v0"

  # Database-specific optimizations
  ballooning       = false  # Disable for database
  cpu_type         = "x86-64-v2"
  ssd_emulation    = true
  discard          = true
  cache_mode       = "none"
}

# Kubernetes Application VM (k3s)
module "k8s_vm" {
  source = "./modules/ubuntu-vm"

  vm_name          = "app-k3s"
  target_node      = var.target_node
  cores            = 4
  memory           = 8192   # 8GB RAM
  disk_size        = "40G"
  storage_pool     = "local"
  ssh_public_key   = var.ssh_public_key
  default_password = "changeme123"
  ip_config        = (var.k8s_static_cidr != "" && var.net_gateway != "") ? "ip=${var.k8s_static_cidr},gw=${var.net_gateway}" : "dhcp"
  bridge           = var.vm_bridge
  tags             = "k3s,zitadel,apps,cell-v0"

  # App VM optimizations
  ballooning       = true   # Enable for app workloads
  memory_min       = 4096   # Minimum 4GB
  cpu_type         = "x86-64-v2"
  ssd_emulation    = true
  discard          = true
  cache_mode       = "none"
}

# Create enhanced Ansible inventory
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tpl", {
    postgresql_ip = var.postgres_static_cidr != "" ? replace(var.postgres_static_cidr, "/.*", "") : module.postgresql_vm.vm_ip
    k8s_ip        = var.k8s_static_cidr != "" ? replace(var.k8s_static_cidr, "/.*", "") : module.k8s_vm.vm_ip
    proxmox_host  = var.proxmox_host_ip
  })
  filename = "../ansible/inventory/hosts.yml"

  depends_on = [
    module.postgresql_vm,
    module.k8s_vm
  ]
}

# Generate environment-specific values
resource "local_file" "environment_vars" {
  content = templatefile("${path.module}/templates/env.tpl", {
    postgresql_ip = module.postgresql_vm.vm_ip
    k8s_ip        = module.k8s_vm.vm_ip
    domain        = "auth.wenzelarifiandi.com"
  })
  filename = "../ansible/group_vars/all/generated.yml"

  depends_on = [
    module.postgresql_vm,
    module.k8s_vm
  ]
}
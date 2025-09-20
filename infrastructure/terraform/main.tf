# Cell v0 - Hybrid PostgreSQL VM + K8s VM Architecture

# Ubuntu Template Creation
module "ubuntu_template" {
  source = "./modules/ubuntu-template"

  proxmox_host           = var.proxmox_host_ip
  ssh_private_key_path   = var.ssh_private_key_path
  template_id            = 9000
  template_name          = "ubuntu-24.04-template"
  storage_pool           = "local"
  vm_bridge              = var.vm_bridge
  force_rebuild_template = var.force_rebuild_template
}

# PostgreSQL Database VM
module "postgresql_vm" {
  source = "./modules/ubuntu-vm"

  depends_on = [module.ubuntu_template]

  vm_name      = "db-postgres"
  target_node  = var.target_node
  cores        = 4
  memory       = 12288 # 12GB RAM
  disk_size    = "100G"
  storage_pool = "local"
  bridge       = var.vm_bridge
  nic_firewall = false
  macaddr      = var.macaddr_db
  tags         = "postgres,database,cell-v0"

  # Database-specific optimizations
  ballooning    = false # Disable for database
  cpu_type      = "x86-64-v2"
  ssd_emulation = true
  discard       = true
  cache_mode    = "none"
}

# Kubernetes Application VM (k3s)
module "k8s_vm" {
  source = "./modules/ubuntu-vm"

  depends_on = [module.ubuntu_template]

  vm_name      = "app-k3s"
  target_node  = var.target_node
  cores        = 4
  memory       = 8192 # 8GB RAM
  disk_size    = "40G"
  storage_pool = "local"
  bridge       = var.vm_bridge
  nic_firewall = false
  macaddr      = var.macaddr_k3s
  tags         = "k3s,zitadel,apps,cell-v0"

  # App VM optimizations
  ballooning    = true # Enable for app workloads
  memory_min    = 4096 # Minimum 4GB
  cpu_type      = "x86-64-v2"
  ssd_emulation = true
  discard       = true
  cache_mode    = "none"
}

# Proxmox Backup Server VM (étoile.neve)
module "pbs_vm" {
  source = "./modules/ubuntu-vm"

  depends_on = [module.ubuntu_template]

  vm_name      = "etoile-pbs"
  target_node  = var.target_node
  cores        = 2
  memory       = 4096 # 4GB RAM
  disk_size    = "40G"
  storage_pool = "local"
  bridge       = var.vm_bridge
  nic_firewall = false
  macaddr      = var.macaddr_pbs
  tags         = "pbs,backup,etoile,cell-v0"

  # PBS-specific optimizations
  ballooning    = false # Disable for backup server
  cpu_type      = "x86-64-v2"
  ssd_emulation = true
  discard       = true
  cache_mode    = "none" # Avoid QEMU start issues on some storage backends
}

# Create enhanced Ansible inventory
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/inventory.tpl", {
    postgresql_ip = var.postgres_ip
    k8s_ip        = var.k8s_ip
    pbs_ip        = var.pbs_ip
    proxmox_host  = var.proxmox_host_ip
  })
  filename = "../ansible/inventory/hosts.yml"

  depends_on = [
    module.postgresql_vm,
    module.k8s_vm,
    module.pbs_vm
  ]
}

# Generate environment-specific values
resource "local_file" "environment_vars" {
  content = templatefile("${path.module}/templates/env.tpl", {
    postgresql_ip = var.postgres_ip
    k8s_ip        = var.k8s_ip
    domain        = "auth.wenzelarifiandi.com"
  })
  filename = "../ansible/group_vars/all/generated.yml"

  depends_on = [
    module.postgresql_vm,
    module.k8s_vm
  ]
}

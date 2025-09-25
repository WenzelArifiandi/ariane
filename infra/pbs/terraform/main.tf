provider "proxmox" {
  pm_api_url          = "https://127.0.0.1:8006/api2/json"
  pm_api_token_id     = var.token_id
  pm_api_token_secret = var.token_secret
  pm_tls_insecure     = true
}

resource "proxmox_vm_qemu" "pbs" {
  name        = "pbs-01"
  target_node = "neve"
  vmid        = 1201

  clone       = "debian12-cloud"
  full_clone  = true

  cores  = 2
  memory = 4096
  scsihw = "virtio-scsi-pci"

  disk {
    slot    = 0
    size    = "100G"
    type    = "scsi"
    storage = "vmdata"
  }

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  agent     = 1
  ciuser    = "debian"
  sshkeys   = var.ssh_key
  ipconfig0 = "dhcp"
}

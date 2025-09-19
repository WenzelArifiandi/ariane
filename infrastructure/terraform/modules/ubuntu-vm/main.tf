resource "proxmox_vm_qemu" "ubuntu_vm" {
  name                      = var.vm_name
  target_node              = var.target_node
  clone                    = var.template_name
  full_clone               = true

  # Hardware configuration
  cores                    = var.cores
  memory                   = var.memory
  balloon                  = var.ballooning ? (var.memory_min != null ? var.memory_min : var.memory / 2) : 0
  sockets                  = 1
  cpu                      = var.cpu_type
  numa                     = false
  hotplug                  = "network,disk,usb"

  # Boot configuration
  boot                     = "order=scsi0"
  agent                    = 1
  qemu_os                  = "l26"

  # Network configuration
  network {
    model    = "virtio"
    bridge   = "vmbr0"
    firewall = true
  }

  # Disk configuration - enterprise settings
  disks {
    scsi {
      scsi0 {
        disk {
          size       = var.disk_size
          storage    = var.storage_pool
          type       = "disk"
          format     = "raw"
          cache      = var.cache_mode
          discard    = var.discard ? "on" : "off"
          ssd        = var.ssd_emulation ? 1 : 0
          iothread   = true
          asyncio    = "native"
        }
      }
    }
  }

  # SCSI controller optimization
  scsihw = "virtio-scsi-single"

  # Cloud-init configuration
  os_type                  = "cloud-init"
  cloudinit_cdrom_storage = "local"

  # Cloud-init settings
  ciuser     = "ubuntu"
  cipassword = var.default_password
  sshkeys    = var.ssh_public_key
  ipconfig0  = var.ip_config

  # Performance settings
  onboot     = true
  startup    = "order=3,up=30"

  # Lifecycle management
  lifecycle {
    ignore_changes = [
      network,
      cipassword,
      startup,
    ]
  }

  # Tags for organization
  tags = var.tags

  # Enable QEMU guest agent
  define_connection_info = true
}
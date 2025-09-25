resource "proxmox_virtual_environment_vm" "pbs" {
  node_name = "neve"
  vm_id     = 1201
  name      = "pbs"

  # match current power state
  started = true

  # match scsi controller seen in state
  scsi_hardware = "virtio-scsi-pci"

  agent {
    enabled = true
  }

  cpu {
    cores = 2
  }

  memory {
    dedicated = 2048
  }

  network_device {
    bridge = "vmbr0"
    model  = "virtio"
  }

  # this matches the 3 GiB raw scsi0 disk the template has
  disk {
    datastore_id = "vmdata"
    interface    = "scsi0"
    size         = 3
    file_format  = "raw"
  }

  # cloud-init drive exists as ide2 on vmdata (no user-data yet)
  initialization {
    datastore_id = "vmdata"
    interface    = "ide2"
  }

  serial_device {
    device = "socket"
  }

  vga {
    type   = "serial0"
    memory = 16
  }
}

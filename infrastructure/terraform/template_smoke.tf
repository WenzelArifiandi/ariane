# Template Smoke Test VM
# Tests the ubuntu-24.04-fix template before deploying production VMs

resource "proxmox_vm_qemu" "template_smoke" {
  count = var.enable_smoke_test ? 1 : 0

  depends_on = [module.ubuntu_template]

  name        = "template-smoke"
  target_node = var.target_node
  clone       = "ubuntu-24.04-template"
  full_clone  = true
  scsihw      = "virtio-scsi-single"

  # Minimal resources for testing
  sockets = 1
  cores   = 1
  memory  = 1024

  # Network configuration on vmbr1
  network {
    id     = 0
    model  = "virtio"
    bridge = var.vm_bridge
  }

  # Allow overriding the network config so we can pin a static IP during smoke tests
  ipconfig0 = var.smoke_test_ipconfig != "" ? var.smoke_test_ipconfig : null

  onboot = true

  # Serial console and agent for testing
  serial {
    id   = 0
    type = "socket"
  }

  vga {
    type = "serial0"
  }

  agent = 1

  # Use same cloud-init config as production VMs
  cicustom = "meta=local:snippets/meta-9001.yml,user=local:snippets/user-9001.yml"
  ciuser   = "ubuntu"

  # Lifecycle management
  lifecycle {
    create_before_destroy = true
    ignore_changes        = [boot, bootdisk, disks]
  }

  timeouts {
    create = "10m"
  }

  tags = "smoke-test,temporary"
}

resource "null_resource" "attach_scsi0" {
  count = var.enable_smoke_test ? 1 : 0

  triggers = {
    vmid                = proxmox_vm_qemu.template_smoke[0].vmid
    host                = var.proxmox_host_ip
    golden_template_rev = var.force_rebuild_template
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -euo pipefail
      VMID=${self.triggers.vmid}
      HOST=${self.triggers.host}
      ssh -o StrictHostKeyChecking=no root@$HOST "set -euo pipefail; CONF=/etc/pve/qemu-server/$VMID.conf; DISK=\$(awk -F': ' '/^unused[0-9]+: /{print \$2; exit}' \"\$CONF\" || true); if [ -z \"\$DISK\" ]; then exit 0; fi; qm stop $VMID >/dev/null 2>&1 || true; qm set $VMID --scsihw virtio-scsi-single --scsi0 \"\$DISK\" --boot order=scsi0 --bootdisk scsi0; sed -i '/^unused[0-9]\\+: .*/d' \"\$CONF\" || true; qm start $VMID >/dev/null 2>&1 || true"
    EOT
  }

  depends_on = [proxmox_vm_qemu.template_smoke]
}

output "template_smoke_ip" {
  value       = var.enable_smoke_test ? try(proxmox_vm_qemu.template_smoke[0].default_ipv4_address, "unknown") : null
  description = "IP address of the template smoke test VM"
}

output "template_smoke_status" {
  value = var.enable_smoke_test ? (
    var.smoke_test_ipconfig != ""
    ? "Template smoke test VM created with IP: ${split("/", split("=", split(",", var.smoke_test_ipconfig)[0])[1])[0]}"
    : "Template smoke test VM created with DHCP IP: ${try(proxmox_vm_qemu.template_smoke[0].default_ipv4_address, "pending")}"
  ) : "Template smoke test disabled"
}

output "template_smoke_vmid" {
  value       = var.enable_smoke_test ? try(proxmox_vm_qemu.template_smoke[0].vmid, null) : null
  description = "VMID of the template smoke test clone"
}

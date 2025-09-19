# Template Smoke Test VM
# Tests the ubuntu-24.04-fix template before deploying production VMs

resource "proxmox_vm_qemu" "template_smoke" {
  count = var.enable_smoke_test ? 1 : 0

  depends_on = [module.ubuntu_template]

  name        = "template-smoke"
  target_node = var.target_node
  clone       = "ubuntu-24.04-template"
  full_clone  = true

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

  # Use DHCP since template has cloud-init networking disabled
  # ipconfig0 and nameserver removed to let netplan handle networking
  onboot     = true

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
  }

  tags = "smoke-test,temporary"
}

output "template_smoke_ip" {
  value       = var.enable_smoke_test ? try(proxmox_vm_qemu.template_smoke[0].default_ipv4_address, "unknown") : null
  description = "IP address of the template smoke test VM"
}

output "template_smoke_status" {
  value = var.enable_smoke_test ? "Template smoke test VM created with DHCP IP: ${try(proxmox_vm_qemu.template_smoke[0].default_ipv4_address, "pending")}" : "Template smoke test disabled"
}
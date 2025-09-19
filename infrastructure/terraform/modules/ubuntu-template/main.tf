terraform {
  required_providers {
    proxmox = {
      source  = "Telmate/proxmox"
      version = "3.0.1-rc6"
    }
  }
}

# Download Ubuntu 24.04 cloud image
resource "null_resource" "download_ubuntu_image" {
  triggers = {
    # Trigger on image URL changes or force rebuild
    image_url = var.ubuntu_image_url
    force_rebuild = var.force_rebuild_template
  }

  connection {
    type = "ssh"
    host = var.proxmox_host
    user = "root"
    # Use SSH agent instead of private key file to handle passphrase
  }

  provisioner "remote-exec" {
    inline = [
      "cd /var/lib/vz/template/iso",
      "wget -O ubuntu-24.04-cloudimg.img '${var.ubuntu_image_url}' || curl -L -o ubuntu-24.04-cloudimg.img '${var.ubuntu_image_url}'"
    ]
  }
}

# Create the template VM
resource "null_resource" "create_template_vm" {
  depends_on = [null_resource.download_ubuntu_image]

  triggers = {
    template_id = var.template_id
    force_rebuild = var.force_rebuild_template
  }

  connection {
    type = "ssh"
    host = var.proxmox_host
    user = "root"
    # Use SSH agent instead of private key file to handle passphrase
  }

  provisioner "remote-exec" {
    inline = [
      # Clean up any existing template/VM with this ID
      "qm stop ${var.template_id} || true",
      "if qm config ${var.template_id} >/dev/null 2>&1; then",
      "  # Convert to VM if it's a template",
      "  sed -i '/^template:/d' /etc/pve/qemu-server/${var.template_id}.conf || true",
      "  qm destroy ${var.template_id} || true",
      "fi",

      # Create new VM
      "cd /var/lib/vz/template/iso",
      "qm create ${var.template_id} --name '${var.template_name}' --memory 2048 --cores 2 --net0 virtio,bridge=${var.vm_bridge} --agent enabled=1 --serial0 socket --vga serial0 --ostype l26",

      # Import and configure disk
      "qm importdisk ${var.template_id} ubuntu-24.04-cloudimg.img ${var.storage_pool}",
      "qm set ${var.template_id} --scsihw virtio-scsi-pci --scsi0 ${var.storage_pool}:${var.template_id}/vm-${var.template_id}-disk-0.raw",
      "qm set ${var.template_id} --boot order=scsi0",
      "qm set ${var.template_id} --ide2 ${var.storage_pool}:cloudinit",
    ]
  }
}

# Create cloud-init configuration
resource "null_resource" "create_cloudinit_config" {
  depends_on = [null_resource.create_template_vm]

  triggers = {
    template_id = var.template_id
    force_rebuild = var.force_rebuild_template
  }

  connection {
    type = "ssh"
    host = var.proxmox_host
    user = "root"
    # Use SSH agent instead of private key file to handle passphrase
  }

  provisioner "remote-exec" {
    inline = [
      # Create cloud-init config for template preparation
      "cat > /var/lib/vz/snippets/template-${var.template_id}-config.yml << 'EOF'",
      "#cloud-config",
      "package_update: true",
      "packages:",
      "  - openssh-server",
      "  - qemu-guest-agent",
      "runcmd:",
      "  - sed -i 's/^GRUB_CMDLINE_LINUX=.*/GRUB_CMDLINE_LINUX=\"net.ifnames=0 biosdevname=0 console=tty1 console=ttyS0,115200n8\"/' /etc/default/grub",
      "  - update-grub",
      "  - rm -f /etc/netplan/*.yaml || true",
      "  - echo 'network: {config: disabled}' > /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg",
      "  - |",
      "    cat > /etc/netplan/01-ens18.yaml << 'NETPLAN_EOF'",
      "    network:",
      "      version: 2",
      "      renderer: networkd",
      "      ethernets:",
      "        ens18:",
      "          dhcp4: true",
      "    NETPLAN_EOF",
      "  - netplan generate",
      "  - netplan apply",
      "  - systemctl enable --now ssh",
      "  - systemctl enable --now qemu-guest-agent",
      "  - systemctl enable --now serial-getty@ttyS0.service",
      "  - cloud-init clean --logs",
      "  - rm -rf /var/lib/cloud/instances/*",
      "power_state:",
      "  delay: '+1'",
      "  mode: poweroff",
      "  message: Golden template configuration complete",
      "EOF",

      # Configure VM with cloud-init
      "qm set ${var.template_id} --cicustom 'user=local:snippets/template-${var.template_id}-config.yml' --ciuser ubuntu --cipassword ubuntu --ipconfig0 ip=dhcp",
    ]
  }
}

# Start VM, let it configure, and wait for shutdown
resource "null_resource" "configure_template_vm" {
  depends_on = [null_resource.create_cloudinit_config]

  triggers = {
    template_id = var.template_id
    force_rebuild = var.force_rebuild_template
  }

  connection {
    type = "ssh"
    host = var.proxmox_host
    user = "root"
    # Use SSH agent instead of private key file to handle passphrase
  }

  provisioner "remote-exec" {
    inline = [
      # Start VM and wait for it to configure and shutdown
      "qm start ${var.template_id}",
      "echo 'Waiting for cloud-init to complete and VM to power off...'",
      "for i in {1..180}; do",
      "  if [ \"$(qm status ${var.template_id} | awk '{print $2}')\" = \"stopped\" ]; then",
      "    echo 'VM powered off successfully'",
      "    break",
      "  fi",
      "  if [ $i -eq 180 ]; then",
      "    echo 'Timeout waiting for VM to power off, forcing stop'",
      "    qm stop ${var.template_id}",
      "  fi",
      "  sleep 1",
      "done",
    ]
  }
}

# Convert to template
resource "null_resource" "convert_to_template" {
  depends_on = [null_resource.configure_template_vm]

  triggers = {
    template_id = var.template_id
    force_rebuild = var.force_rebuild_template
  }

  connection {
    type = "ssh"
    host = var.proxmox_host
    user = "root"
    # Use SSH agent instead of private key file to handle passphrase
  }

  provisioner "remote-exec" {
    inline = [
      # Clean up cloud-init config and convert to template
      "qm set ${var.template_id} --delete cicustom --delete ciuser --delete cipassword --delete ipconfig0",
      "qm template ${var.template_id}",
      "echo 'Template ${var.template_name} created successfully'"
    ]
  }
}
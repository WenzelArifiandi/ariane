output "vm_id" {
  description = "VM ID"
  value       = proxmox_vm_qemu.ubuntu_vm.vmid
}

output "vm_name" {
  description = "VM name"
  value       = proxmox_vm_qemu.ubuntu_vm.name
}

output "vm_ip" {
  description = "VM IP address"
  value       = proxmox_vm_qemu.ubuntu_vm.default_ipv4_address
}

output "ssh_host" {
  description = "SSH connection string"
  value       = "ubuntu@${proxmox_vm_qemu.ubuntu_vm.default_ipv4_address}"
}
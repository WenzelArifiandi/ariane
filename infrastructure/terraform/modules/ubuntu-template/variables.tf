variable "proxmox_host" {
  description = "Proxmox host IP address"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key for Proxmox access"
  type        = string
}

variable "template_id" {
  description = "VMID for the template"
  type        = number
  default     = 9000
}

variable "template_name" {
  description = "Name for the template"
  type        = string
  default     = "ubuntu-24.04-template"
}

variable "ubuntu_image_url" {
  description = "URL for Ubuntu 24.04 cloud image"
  type        = string
  default     = "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
}

variable "storage_pool" {
  description = "Proxmox storage pool name"
  type        = string
  default     = "local"
}

variable "vm_bridge" {
  description = "Network bridge for VMs"
  type        = string
  default     = "vmbr1"
}

variable "force_rebuild_template" {
  description = "Force rebuild of template (change this value to trigger rebuild)"
  type        = string
  default     = "v1"
}
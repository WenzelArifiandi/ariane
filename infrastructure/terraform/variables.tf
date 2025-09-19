variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
  default     = "https://54.39.102.214:8006/api2/json"
}

variable "proxmox_api_token_id" {
  description = "Proxmox API Token ID"
  type        = string
  sensitive   = true
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API Token Secret"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for VM access"
  type        = string
}

variable "target_node" {
  description = "Target Proxmox node"
  type        = string
  default     = "neve"
}

variable "storage_pool" {
  description = "Storage pool for VMs"
  type        = string
  default     = "data"
}

variable "iso_file" {
  description = "Ubuntu ISO file"
  type        = string
  default     = "local:iso/ubuntu-24.04.1-live-server-amd64.iso"
}
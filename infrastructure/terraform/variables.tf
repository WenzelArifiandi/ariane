variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
  default     = "https://54.39.102.214:8006/api2/json"
}

variable "proxmox_user" {
  description = "Proxmox username (optional, for user/password auth)"
  type        = string
  default     = null
  sensitive   = true
}

variable "proxmox_password" {
  description = "Proxmox password (optional, for user/password auth)"
  type        = string
  default     = null
  sensitive   = true
}

variable "proxmox_api_token_id" {
  description = "Proxmox API token id in the form user@realm!tokenid (e.g., root@pam!terraform)"
  type        = string
  default     = null
  sensitive   = true
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API token secret"
  type        = string
  default     = null
  sensitive   = true
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

variable "vm_bridge" {
  description = "Linux bridge to attach VMs to (e.g., vmbr0 for LAN, vmbr1 for NAT)"
  type        = string
  default     = "vmbr0"
}

variable "proxmox_host_ip" {
  description = "Proxmox host IP or hostname for SSH ProxyJump"
  type        = string
  default     = "54.39.102.214"
}

variable "enable_smoke_test" {
  description = "Enable template smoke test VM creation"
  type        = bool
  default     = false
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key for Proxmox access"
  type        = string
  default     = "~/.ssh/id_ed25519"
}

variable "force_rebuild_template" {
  description = "Force rebuild of Ubuntu template (change this value to trigger rebuild)"
  type        = string
  default     = "v4-netplan-clean"
}

variable "macaddr_db" {
  description = "Static MAC address for the database VM"
  type        = string
  default     = "BC:24:11:C1:23:FB"
}

variable "macaddr_k3s" {
  description = "Static MAC address for the k3s VM"
  type        = string
  default     = "BC:24:11:16:52:7F"
}

variable "macaddr_pbs" {
  description = "Static MAC address for the PBS VM"
  type        = string
  default     = "BC:24:11:5C:06:CB"
}

variable "macaddr_smoke" {
  description = "Static MAC address for the smoke test VM"
  type        = string
  default     = "BC:24:11:39:7C:4D"
}

variable "postgres_ip" {
  description = "Expected IPv4 address for the PostgreSQL VM"
  type        = string
  default     = "10.98.0.10"
}

variable "k8s_ip" {
  description = "Expected IPv4 address for the k3s VM"
  type        = string
  default     = "10.98.0.11"
}

variable "pbs_ip" {
  description = "Expected IPv4 address for the PBS VM"
  type        = string
  default     = "10.98.0.12"
}

# Cloudflare variables
variable "cloudflare_api_token" {
  description = "Cloudflare API token for managing Access applications and policies"
  type        = string
  sensitive   = true
}

variable "cipher_client_id" {
  description = "CIPHER OIDC client ID for Cloudflare Access"
  type        = string
  sensitive   = true
}

variable "cipher_client_secret" {
  description = "CIPHER OIDC client secret for Cloudflare Access"
  type        = string
  sensitive   = true
}

variable "cipher_issuer_url" {
  description = "CIPHER issuer URL for OIDC"
  type        = string
  default     = "https://cipher.wenzelarifiandi.com"
}

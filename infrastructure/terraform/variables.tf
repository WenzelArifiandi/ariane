variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
  default     = "https://54.39.102.214:8006/api2/json"
}

variable "proxmox_user" {
  description = "Proxmox username"
  type        = string
  sensitive   = true
}

variable "proxmox_password" {
  description = "Proxmox password"
  type        = string
  sensitive   = true
}

variable "proxmox_api_token_id" {
  description = "Proxmox API token id in the form user@realm!tokenid (e.g., root@pam!terraform)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "proxmox_api_token_secret" {
  description = "Proxmox API token secret"
  type        = string
  default     = ""
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

# Optional static IP configuration (include CIDR in the IP value, e.g., 192.168.1.50/24)
variable "postgres_static_cidr" {
  description = "Optional static IPv4 with CIDR for PostgreSQL VM (e.g., 192.168.1.50/24); leave empty for DHCP"
  type        = string
  default     = ""
}

variable "k8s_static_cidr" {
  description = "Optional static IPv4 with CIDR for K3s VM (e.g., 192.168.1.60/24); leave empty for DHCP"
  type        = string
  default     = ""
}

variable "pbs_static_cidr" {
  description = "Optional static IPv4 with CIDR for PBS VM (e.g., 192.168.1.70/24); leave empty for DHCP"
  type        = string
  default     = ""
}

variable "net_gateway" {
  description = "Gateway IP used when static IPs are set (e.g., 192.168.1.1)"
  type        = string
  default     = ""
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
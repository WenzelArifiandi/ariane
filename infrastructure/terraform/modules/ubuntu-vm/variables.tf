variable "vm_name" {
  description = "Name of the VM"
  type        = string
}

variable "target_node" {
  description = "Target Proxmox node"
  type        = string
}

variable "template_name" {
  description = "Template to clone from"
  type        = string
  default     = "ubuntu-24.04-template"
}

variable "cores" {
  description = "Number of CPU cores"
  type        = number
  default     = 2
}

variable "memory" {
  description = "Memory in MB"
  type        = number
  default     = 4096
}

variable "memory_min" {
  description = "Minimum memory for ballooning (MB)"
  type        = number
  default     = null
}

variable "ballooning" {
  description = "Enable memory ballooning"
  type        = bool
  default     = true
}

variable "cpu_type" {
  description = "CPU type"
  type        = string
  default     = "x86-64-v2"
}

variable "disk_size" {
  description = "Disk size"
  type        = string
  default     = "50G"
}

variable "storage_pool" {
  description = "Storage pool for VM (can include dataset path)"
  type        = string
}

variable "ssd_emulation" {
  description = "Enable SSD emulation"
  type        = bool
  default     = true
}

variable "discard" {
  description = "Enable discard/TRIM"
  type        = bool
  default     = true
}

variable "cache_mode" {
  description = "Cache mode for disk"
  type        = string
  default     = "none"
}

variable "ssh_public_key" {
  description = "SSH public key"
  type        = string
}

variable "default_password" {
  description = "Default password for the user"
  type        = string
  sensitive   = true
}

variable "ip_config" {
  description = "IP configuration (DHCP or static)"
  type        = string
  default     = "dhcp"
}

variable "tags" {
  description = "Tags for the VM"
  type        = string
  default     = "terraform"
}
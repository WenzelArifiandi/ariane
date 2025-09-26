variable "token_id" {
  type        = string
  description = "Proxmox API token id, e.g. root@pam!cli"
  sensitive   = true
}

variable "token_secret" {
  type        = string
  description = "Proxmox API token secret"
  sensitive   = true
}

variable "ssh_key" {
  type        = string
  description = "Public SSH key for cloud-init"
}

variable "node_name" {
  type    = string
  default = "neve"
}

variable "pbs_vm_name" {
  type    = string
  default = "pbs"
}

variable "pbs_vm_id" {
  type    = number
  default = 1201
}

variable "pbs_cpu_cores" {
  type    = number
  default = 2
}

variable "pbs_memory_mb" {
  type    = number
  default = 4096
}

variable "pbs_disk_gb" {
  type    = number
  default = 100
}

variable "datastore_id" {
  type    = string
  default = "vmdata"
}

variable "bridge" {
  type    = string
  default = "vmbr0"
}

variable "template_id" {
  type    = number
  default = 1200
}

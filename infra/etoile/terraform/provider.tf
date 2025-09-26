variable "api_token" {
  type        = string
  description = "Proxmox API token in the form USER@REALM!TOKENID=UUID"
  sensitive   = true
}

provider "proxmox" {
  endpoint  = "https://neve.wenzelarifiandi.com/api2/json"
  api_token = var.api_token
  insecure  = true
}

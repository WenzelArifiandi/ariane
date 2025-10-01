terraform {
  required_version = ">= 1.0"
  required_providers {
    # Commented out Proxmox for now - focus on Cloudflare Access deployment only
    # proxmox = {
    #   source = "telmate/proxmox"
    #   # Use RC version for PVE 9.x compatibility
    #   version = "3.0.2-rc04"
    # }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Commented out Proxmox authentication and provider for now
# Focus on Cloudflare Access deployment only

# # Authentication validation - ensure exactly one auth method is provided
# locals {
#   using_userpass = var.proxmox_user != null && var.proxmox_password != null
#   using_token    = var.proxmox_api_token_id != null && var.proxmox_api_token_secret != null
#
#   # Validation: exactly one auth method must be provided
#   auth_valid = local.using_userpass != local.using_token
# }
#
# # Enforce authentication validation
# resource "null_resource" "auth_guard" {
#   count = local.auth_valid ? 0 : 1
#
#   provisioner "local-exec" {
#     command = "echo 'ERROR: Provide either (user+password) OR (token_id+token_secret), not both or neither' && exit 1"
#   }
# }
#
# provider "proxmox" {
#   pm_api_url          = var.proxmox_api_url
#   pm_user             = var.proxmox_user
#   pm_password         = var.proxmox_password
#   pm_api_token_id     = var.proxmox_api_token_id
#   pm_api_token_secret = var.proxmox_api_token_secret
#   pm_tls_insecure     = true
#   pm_parallel         = 1
#   pm_timeout          = 600
#   pm_debug            = false
# }

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
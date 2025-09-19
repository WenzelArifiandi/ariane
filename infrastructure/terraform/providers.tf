terraform {
  required_version = ">= 1.0"
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      # Use RC version for PVE 9.x compatibility
      version = "3.0.2-rc04"
    }
  }
}

provider "proxmox" {
  pm_api_url      = var.proxmox_api_url
  # Prefer API token auth when provided; fallback to user/password
  pm_api_token_id     = var.proxmox_api_token_id != "" ? var.proxmox_api_token_id : null
  pm_api_token_secret = var.proxmox_api_token_secret != "" ? var.proxmox_api_token_secret : null
  # If token is provided, explicitly null-out user/password to prevent mixed auth
  pm_user             = (var.proxmox_api_token_id != "" && var.proxmox_api_token_secret != "") ? null : var.proxmox_user
  pm_password         = (var.proxmox_api_token_id != "" && var.proxmox_api_token_secret != "") ? null : var.proxmox_password
  pm_tls_insecure = true
  pm_parallel     = 1
  pm_timeout      = 600
  pm_debug        = false
}
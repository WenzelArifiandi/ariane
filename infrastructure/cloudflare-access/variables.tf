# Cloudflare API token
variable "cloudflare_api_token" {
  description = "Cloudflare API token for managing Access applications and policies"
  type        = string
  sensitive   = true
}

# Cipher OIDC credentials
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
  description = "CIPHER domain URL (protected by Cloudflare Access)"
  type        = string
  default     = "https://cipher.wenzelarifiandi.com"
}

# Note: cloudflare_account_id removed to simplify initial deployment
# Can be added later when tags are needed
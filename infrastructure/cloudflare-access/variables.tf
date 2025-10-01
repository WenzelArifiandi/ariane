# Cloudflare API token
variable "cloudflare_api_token" {
  description = "Cloudflare API token for managing Access applications and policies. Can be set via TF_VAR_cloudflare_api_token environment variable."
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.cloudflare_api_token) > 10
    error_message = "Cloudflare API token must be provided. Set TF_VAR_cloudflare_api_token environment variable or add to terraform.tfvars file."
  }
}

# Cipher OIDC credentials
variable "cipher_client_id" {
  description = "CIPHER OIDC client ID for Cloudflare Access. Can be set via TF_VAR_cipher_client_id environment variable."
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.cipher_client_id) > 0
    error_message = "Cipher client ID must be provided. Set TF_VAR_cipher_client_id environment variable or add to terraform.tfvars file."
  }
}

variable "cipher_client_secret" {
  description = "CIPHER OIDC client secret for Cloudflare Access. Can be set via TF_VAR_cipher_client_secret environment variable."
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.cipher_client_secret) > 0
    error_message = "Cipher client secret must be provided. Set TF_VAR_cipher_client_secret environment variable or add to terraform.tfvars file."
  }
}

variable "cipher_issuer_url" {
  description = "CIPHER domain URL (protected by Cloudflare Access)"
  type        = string
  default     = "https://cipher.wenzelarifiandi.com"
}

# Note: cloudflare_account_id removed to simplify initial deployment
# Can be added later when tags are needed
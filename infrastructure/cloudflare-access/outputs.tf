# Cloudflare Access Outputs
output "cloudflare_access_application" {
  description = "Cloudflare Access application information"
  value = {
    id     = cloudflare_zero_trust_access_application.auth.id
    domain = cloudflare_zero_trust_access_application.auth.domain
    aud    = cloudflare_zero_trust_access_application.auth.aud
    name   = cloudflare_zero_trust_access_application.auth.name
  }
  sensitive = false
}

output "cloudflare_access_identity_provider" {
  description = "Cipher OIDC identity provider information"
  value = {
    id   = cloudflare_zero_trust_access_identity_provider.cipher_oidc.id
    name = cloudflare_zero_trust_access_identity_provider.cipher_oidc.name
    type = cloudflare_zero_trust_access_identity_provider.cipher_oidc.type
  }
  sensitive = false
}

output "cloudflare_access_service_token" {
  description = "Service token for programmatic access"
  value = {
    id            = cloudflare_zero_trust_access_service_token.cipher_service_token.id
    name          = cloudflare_zero_trust_access_service_token.cipher_service_token.name
    client_id     = cloudflare_zero_trust_access_service_token.cipher_service_token.client_id
    client_secret = cloudflare_zero_trust_access_service_token.cipher_service_token.client_secret
  }
  sensitive = true
}

output "cipher_access_info" {
  description = "Complete auth subdomain access setup information"
  value = {
    application = {
      url    = "https://auth.wenzelarifiandi.com"
      access = "https://auth.wenzelarifiandi.com/cdn-cgi/access/login"
    }
    authentication = {
      provider = "Cipher OIDC"
      issuer   = var.cipher_issuer_url
    }
    policies = [
      "Allow Cipher OIDC Users",
      "Allow Service Token"
    ]
    service_token = {
      usage = "For programmatic API access"
      note  = "Store client_id and client_secret securely"
    }
  }
}

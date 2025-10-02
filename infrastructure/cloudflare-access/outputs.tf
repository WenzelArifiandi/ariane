# Cloudflare Access Outputs

output "maker_application" {
  description = "Cloudflare Access Application for /maker endpoint"
  value = {
    id     = cloudflare_zero_trust_access_application.maker.id
    name   = cloudflare_zero_trust_access_application.maker.name
    domain = cloudflare_zero_trust_access_application.maker.domain
    aud    = cloudflare_zero_trust_access_application.maker.aud
  }
}

output "cipher_idp" {
  description = "Cipher OIDC Identity Provider details"
  value = {
    id   = cloudflare_zero_trust_access_identity_provider.cipher_oidc.id
    name = cloudflare_zero_trust_access_identity_provider.cipher_oidc.name
  }
}

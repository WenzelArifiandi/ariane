output "cloudflare_access_application_auth" {
  value = {
    id     = cloudflare_zero_trust_access_application.auth.id
    name   = cloudflare_zero_trust_access_application.auth.name
    domain = cloudflare_zero_trust_access_application.auth.domain
  }
}

output "cloudflare_access_application_maker" {
  value = {
    id     = cloudflare_zero_trust_access_application.maker.id
    name   = cloudflare_zero_trust_access_application.maker.name
    domain = cloudflare_zero_trust_access_application.maker.domain
  }
}

# Cloudflare Access for wenzelarifiandi.com/maker
# Single, clean configuration - Terraform as source of truth

# Get the zone ID for wenzelarifiandi.com
data "cloudflare_zone" "wenzelarifiandi" {
  name = "wenzelarifiandi.com"
}

# Create Access Identity Provider - Cipher ZITADEL as OIDC provider
resource "cloudflare_zero_trust_access_identity_provider" "cipher_oidc" {
  account_id = var.cloudflare_account_id
  name       = "Cipher OIDC"
  type       = "oidc"

  config {
    client_id     = var.cipher_client_id
    client_secret = var.cipher_client_secret
    auth_url      = "${var.cipher_issuer_url}/oauth/v2/authorize"
    token_url     = "${var.cipher_issuer_url}/oauth/v2/token"
    certs_url     = "${var.cipher_issuer_url}/oauth/v2/keys"
    scopes        = ["openid", "profile", "email"]
    claims        = ["email", "groups", "preferred_username"]
    email_claim_name = "email"
  }

  lifecycle {
    # Prevent accidental deletion/recreation
    prevent_destroy = false
    # Ignore changes to avoid recreation on minor API differences
    ignore_changes = [
      config[0].claims,
    ]
  }
}

# Access Application for /maker endpoint
resource "cloudflare_zero_trust_access_application" "maker" {
  account_id       = var.cloudflare_account_id
  name             = "Ariane Maker"
  domain           = "wenzelarifiandi.com/maker"
  type             = "self_hosted"
  session_duration = "24h"

  # Use Cipher OIDC for authentication
  allowed_idps = [cloudflare_zero_trust_access_identity_provider.cipher_oidc.id]

  # Application branding
  logo_url = "https://wenzelarifiandi.com/favicon.svg"

  # CORS for client-side auth checks
  cors_headers {
    allowed_origins   = ["https://wenzelarifiandi.com", "http://localhost:4321"]
    allowed_methods   = ["GET", "HEAD", "OPTIONS"]
    allow_credentials = true
  }

  # Skip interstitial for smooth UX
  skip_interstitial = true
}

# Access Policy - Allow Cipher OIDC authenticated users
resource "cloudflare_zero_trust_access_policy" "maker_policy" {
  application_id = cloudflare_zero_trust_access_application.maker.id
  account_id     = var.cloudflare_account_id
  name           = "Allow Cipher OIDC Users"
  precedence     = 1
  decision       = "allow"

  include {
    login_method = [cloudflare_zero_trust_access_identity_provider.cipher_oidc.id]
  }

  session_duration = "24h"
}

# Cache Rules for cipher.wenzelarifiandi.com - Bypass cache for OIDC + UI paths
resource "cloudflare_ruleset" "cipher_cache_bypass" {
  zone_id     = data.cloudflare_zone.wenzelarifiandi.id
  name        = "Cipher ZITADEL Cache Bypass"
  description = "Bypass cache for ZITADEL OIDC endpoints and UI assets"
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = false
    }
    expression  = "(http.host eq \"cipher.wenzelarifiandi.com\" and (starts_with(http.request.uri.path, \"/.well-known/\") or starts_with(http.request.uri.path, \"/oidc/v1/\") or starts_with(http.request.uri.path, \"/oauth/v2/\") or starts_with(http.request.uri.path, \"/ui/\") or starts_with(http.request.uri.path, \"/assets/\")))"
    description = "Bypass cache for OIDC endpoints and UI"
    enabled     = true
  }
}

# Page Rules for cipher.wenzelarifiandi.com - Disable interfering features
resource "cloudflare_page_rule" "cipher_well_known" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/.well-known/*"
  priority = 1

  actions {
    cache_level              = "bypass"
    email_obfuscation        = "off"
    rocket_loader            = "off"
    mirage                   = "off"
    automatic_https_rewrites = "off"
  }
}

resource "cloudflare_page_rule" "cipher_oidc_v1" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/oidc/v1/*"
  priority = 2

  actions {
    cache_level              = "bypass"
    email_obfuscation        = "off"
    rocket_loader            = "off"
    mirage                   = "off"
    automatic_https_rewrites = "off"
  }
}

resource "cloudflare_page_rule" "cipher_oauth_v2" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/oauth/v2/*"
  priority = 3

  actions {
    cache_level              = "bypass"
    email_obfuscation        = "off"
    rocket_loader            = "off"
    mirage                   = "off"
    automatic_https_rewrites = "off"
  }
}

resource "cloudflare_page_rule" "cipher_ui" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/ui/*"
  priority = 4

  actions {
    cache_level              = "bypass"
    email_obfuscation        = "off"
    rocket_loader            = "off"
    mirage                   = "off"
    automatic_https_rewrites = "off"
  }
}

resource "cloudflare_page_rule" "cipher_assets" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/assets/*"
  priority = 5

  actions {
    cache_level              = "bypass"
    email_obfuscation        = "off"
    rocket_loader            = "off"
    mirage                   = "off"
    automatic_https_rewrites = "off"
  }
}

# WAF Bypass for cipher.wenzelarifiandi.com - Skip managed rules for ZITADEL paths
resource "cloudflare_ruleset" "cipher_waf_bypass" {
  zone_id     = data.cloudflare_zone.wenzelarifiandi.id
  name        = "Cipher ZITADEL WAF Bypass"
  description = "Skip WAF for ZITADEL OIDC endpoints and UI"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action = "skip"
    action_parameters {
      ruleset = "current"
    }
    expression  = "(http.host eq \"cipher.wenzelarifiandi.com\" and (starts_with(http.request.uri.path, \"/.well-known/\") or starts_with(http.request.uri.path, \"/oidc/v1/\") or starts_with(http.request.uri.path, \"/oauth/v2/\") or starts_with(http.request.uri.path, \"/ui/\") or starts_with(http.request.uri.path, \"/assets/\")))"
    description = "Skip WAF for OIDC and UI paths"
    enabled     = true
  }
}


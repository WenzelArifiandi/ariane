# Cloudflare Access Application and Policy for auth.wenzelarifiandi.com

# Get the zone ID for wenzelarifiandi.com
data "cloudflare_zone" "wenzelarifiandi" {
  name = "wenzelarifiandi.com"
}

# DNS record: auth → cipher (proxied)
resource "cloudflare_record" "auth_cname" {
  zone_id = data.cloudflare_zone.wenzelarifiandi.id
  name    = "auth"
  type    = "CNAME"
  value   = "cipher.wenzelarifiandi.com"
  proxied = true
  ttl     = 1
}

# Create Access Application for auth.wenzelarifiandi.com
resource "cloudflare_access_application" "auth" {
  zone_id                   = data.cloudflare_zone.wenzelarifiandi.id
  name                     = "Ariane Auth"
  domain                   = "auth.wenzelarifiandi.com"
  type                     = "self_hosted"
  session_duration         = "24h"
  auto_redirect_to_identity = false

  # Enable application logo and branding (optional)
  logo_url = "https://wenzelarifiandi.com/favicon.ico"

  # Custom deny URL - redirect unauthorized users to main site
  custom_deny_url = "https://wenzelarifiandi.com"
  custom_deny_message = "Please authenticate to access Maker features"

  # CORS settings for web applications - allow primary site and localhost for development
  cors_headers {
    allow_all_origins     = false
    allow_all_methods     = false
    allow_all_headers     = false
    allowed_origins       = ["https://wenzelarifiandi.com", "http://localhost:4321"]
    allowed_methods       = ["GET", "POST", "OPTIONS"]
    allowed_headers       = ["Content-Type", "Authorization"]
    allow_credentials     = true
    max_age              = 86400
  }

  tags = ["production", "auth", "zitadel-auth"]
}

# Cache Rules for cipher.wenzelarifiandi.com OIDC endpoints
# Bypass cache for OIDC/OAuth endpoints to prevent stale responses
resource "cloudflare_ruleset" "cipher_cache_rules" {
  zone_id     = data.cloudflare_zone.wenzelarifiandi.id
  name        = "Cipher OIDC Cache Rules"
  description = "Bypass cache for ZITADEL OIDC endpoints"
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = false
    }
    expression  = "(http.host eq \"cipher.wenzelarifiandi.com\" and (starts_with(http.request.uri.path, \"/.well-known/\") or starts_with(http.request.uri.path, \"/oidc/v1/\") or starts_with(http.request.uri.path, \"/oauth/v2/\")))"
    description = "Bypass cache for OIDC endpoints"
    enabled     = true
  }
}

# Configuration Rules for cipher.wenzelarifiandi.com OIDC endpoints
# Disable potentially interfering features like email obfuscation, rocket loader, etc.
resource "cloudflare_page_rule" "cipher_oidc_settings" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/.well-known/*"
  priority = 1

  actions {
    cache_level         = "bypass"
    email_obfuscation   = "off"
    rocket_loader       = "off"
    mirage              = "off"
    automatic_https_rewrites = "off"
  }
}

resource "cloudflare_page_rule" "cipher_oidc_v1_settings" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/oidc/v1/*"
  priority = 2

  actions {
    cache_level         = "bypass"
    email_obfuscation   = "off"
    rocket_loader       = "off"
    mirage              = "off"
    automatic_https_rewrites = "off"
  }
}

resource "cloudflare_page_rule" "cipher_oauth_v2_settings" {
  zone_id  = data.cloudflare_zone.wenzelarifiandi.id
  target   = "cipher.wenzelarifiandi.com/oauth/v2/*"
  priority = 3

  actions {
    cache_level         = "bypass"
    email_obfuscation   = "off"
    rocket_loader       = "off"
    mirage              = "off"
    automatic_https_rewrites = "off"
  }
}

# WAF/Firewall bypass for cipher OIDC endpoints
resource "cloudflare_ruleset" "cipher_waf_bypass" {
  zone_id     = data.cloudflare_zone.wenzelarifiandi.id
  name        = "Cipher OIDC WAF Bypass"
  description = "Skip WAF for ZITADEL OIDC endpoints"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action = "skip"
    action_parameters {
      ruleset = "current"
    }
    expression  = "(http.host eq \"cipher.wenzelarifiandi.com\" and (starts_with(http.request.uri.path, \"/.well-known/\") or starts_with(http.request.uri.path, \"/oidc/v1/\") or starts_with(http.request.uri.path, \"/oauth/v2/\")))"
    description = "Skip WAF for OIDC endpoints"
    enabled     = true
  }
}

# Create Access Identity Provider - Cipher ZITADEL as OIDC provider
resource "cloudflare_access_identity_provider" "cipher_oidc" {
  zone_id = data.cloudflare_zone.wenzelarifiandi.id
  name    = "Cipher OIDC"
  type    = "oidc"

  config {
    client_id       = var.cipher_client_id
    client_secret   = var.cipher_client_secret
    auth_url        = "${var.cipher_issuer_url}/oauth/v2/authorize"
    token_url       = "${var.cipher_issuer_url}/oauth/v2/token"
    certs_url       = "${var.cipher_issuer_url}/oauth/v2/keys"
    scopes          = ["openid", "profile", "email"]
    
    # Additional OIDC claims
    claims          = ["email", "groups", "preferred_username"]
    
    # Enable email domain validation
    email_claim_name = "email"
  }
}

# Create Access Policy allowing login via Cipher OIDC
resource "cloudflare_access_policy" "cipher_oidc_policy" {
  application_id = cloudflare_access_application.auth.id
  zone_id        = data.cloudflare_zone.wenzelarifiandi.id
  name           = "Allow Cipher OIDC Users"
  precedence     = 1
  decision       = "allow"
  
  # Include rule: Users authenticated via Cipher OIDC
  include {
    login_method = [cloudflare_access_identity_provider.cipher_oidc.id]
  }
  
  # Optional: Add email domain restriction
  # include {
  #   email_domain = ["wenzelarifiandi.com"]
  # }
  
  # Require authentication via Cipher OIDC
  require {
    login_method = [cloudflare_access_identity_provider.cipher_oidc.id]
  }
  
  # Session settings
  session_duration = "24h"
}

# Optional: Create a service token for programmatic access
resource "cloudflare_access_service_token" "cipher_service_token" {
  zone_id = data.cloudflare_zone.wenzelarifiandi.id
  name    = "Cipher Service Token"
  
  # Optional: Set duration (default is indefinite)
  # duration = "8760h"  # 1 year
}

# Optional: Create policy for service token access
resource "cloudflare_access_policy" "cipher_service_policy" {
  application_id = cloudflare_access_application.auth.id
  zone_id        = data.cloudflare_zone.wenzelarifiandi.id
  name           = "Allow Service Token"
  precedence     = 2
  decision       = "allow"
  
  include {
    service_token = [cloudflare_access_service_token.cipher_service_token.id]
  }
}

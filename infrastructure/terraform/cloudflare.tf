# Cloudflare Access Application and Policy for cipher.wenzelarifiandi.com

# Get the zone ID for wenzelarifiandi.com
data "cloudflare_zone" "wenzelarifiandi" {
  name = "wenzelarifiandi.com"
}

# Create Access Application for cipher.wenzelarifiandi.com
resource "cloudflare_access_application" "cipher" {
  zone_id                   = data.cloudflare_zone.wenzelarifiandi.id
  name                     = "Cipher Application"
  domain                   = "cipher.wenzelarifiandi.com"
  type                     = "self_hosted"
  session_duration         = "24h"
  auto_redirect_to_identity = true
  
  # Enable application logo and branding (optional)
  logo_url = "https://wenzelarifiandi.com/favicon.ico"
  
  # CORS settings for web applications
  cors_headers {
    allow_all_origins     = false
    allow_all_methods     = false
    allow_all_headers     = false
    allowed_origins       = ["https://cipher.wenzelarifiandi.com"]
    allowed_methods       = ["GET", "POST", "OPTIONS"]
    allowed_headers       = ["Content-Type", "Authorization"]
    allow_credentials     = true
    max_age              = 86400
  }

  tags = ["production", "cipher", "zitadel-auth"]
}

# Create Access Identity Provider for CIPHER OIDC
resource "cloudflare_access_identity_provider" "cipher_oidc" {
  zone_id = data.cloudflare_zone.wenzelarifiandi.id
  name    = "CIPHER OIDC"
  type    = "oidc"

  config {
    client_id       = var.cipher_client_id
    client_secret   = var.cipher_client_secret
    auth_url        = "${var.cipher_issuer_url}/oauth/v2/authorize"
    token_url       = "${var.cipher_issuer_url}/oauth/v2/token"
    certs_url       = "${var.cipher_issuer_url}/oauth/v2/keys"
    scopes          = ["openid", "profile", "email"]
    
    # Additional OIDC claims
    claims          = ["email", "groups"]
    
    # Enable email domain validation (optional)
    email_claim_name = "email"
  }
}

# Create Access Policy allowing login via CIPHER
resource "cloudflare_access_policy" "cipher_oidc_policy" {
  application_id = cloudflare_access_application.cipher.id
  zone_id        = data.cloudflare_zone.wenzelarifiandi.id
  name           = "Allow CIPHER Users"
  precedence     = 1
  decision       = "allow"
  
  # Include rule: Users authenticated via CIPHER
  include {
    login_method = [cloudflare_access_identity_provider.cipher_oidc.id]
  }
  
  # Optional: Add email domain restriction
  # include {
  #   email_domain = ["wenzelarifiandi.com"]
  # }
  
  # Optional: Require additional factors
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
  application_id = cloudflare_access_application.cipher.id
  zone_id        = data.cloudflare_zone.wenzelarifiandi.id
  name           = "Allow Service Token"
  precedence     = 2
  decision       = "allow"
  
  include {
    service_token = [cloudflare_access_service_token.cipher_service_token.id]
  }
}
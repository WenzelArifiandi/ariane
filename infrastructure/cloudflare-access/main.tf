# Cloudflare Access Application and Policy for auth.wenzelarifiandi.com

# Get the zone ID for wenzelarifiandi.com (still needed for some resources)
data "cloudflare_zone" "wenzelarifiandi" {
  name = "wenzelarifiandi.com"
}

# Get account information
data "cloudflare_accounts" "main" {
  name = "wenzelarifiandi@gmail.com" # Replace with your account name/email if different
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

    # Additional OIDC claims
    claims = ["email", "groups", "preferred_username"]

    # Enable email domain validation
    email_claim_name = "email"
  }
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
resource "cloudflare_zero_trust_access_application" "auth" {
  account_id                = var.cloudflare_account_id
  name                      = "Ariane Auth"
  domain                    = "auth.wenzelarifiandi.com"
  type                      = "self_hosted"
  session_duration          = "24h"
  auto_redirect_to_identity = true

  # Specify exactly one IdP for auto-redirect (required when auto_redirect_to_identity = true)
  allowed_idps = [cloudflare_zero_trust_access_identity_provider.cipher_oidc.id]

  # Enable application logo and branding (optional)
  logo_url = "https://wenzelarifiandi.com/favicon.ico"

  # CORS settings for cross-origin auth checks from Ariane
  cors_headers {
    allowed_origins   = ["https://wenzelarifiandi.com", "http://localhost:4321"]
    allowed_methods   = ["GET", "OPTIONS"]
    allow_credentials = true
  }

  # Tags removed for now - can be added later when account ID is available
  # tags = ["production", "cipher", "zitadel-auth"]
}

# Create Access Policy allowing login via Cipher OIDC
resource "cloudflare_zero_trust_access_policy" "cipher_oidc_policy" {
  application_id = cloudflare_zero_trust_access_application.auth.id
  account_id     = var.cloudflare_account_id
  name           = "Allow Cipher OIDC Users"
  precedence     = 1
  decision       = "allow"

  # Include rule: Users authenticated via Cipher OIDC
  include {
    login_method = [cloudflare_zero_trust_access_identity_provider.cipher_oidc.id]
  }

  # Require authentication via Cipher OIDC
  require {
    login_method = [cloudflare_zero_trust_access_identity_provider.cipher_oidc.id]
  }

  # Session settings
  session_duration = "24h"
}

# Optional: Create a service token for programmatic access
resource "cloudflare_zero_trust_access_service_token" "cipher_service_token" {
  account_id = var.cloudflare_account_id
  name       = "Cipher Service Token"
}

# Optional: Create policy for service token access
resource "cloudflare_zero_trust_access_policy" "cipher_service_policy" {
  application_id = cloudflare_zero_trust_access_application.auth.id
  account_id     = var.cloudflare_account_id
  name           = "Allow Service Token"
  precedence     = 2
  decision       = "allow"

  include {
    service_token = [cloudflare_zero_trust_access_service_token.cipher_service_token.id]
  }
}

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

# Note: Zone-level rules (Cache, Page, WAF) require manual configuration
# The API token is account-scoped and doesn't support Page Rules API
# Page Rules also cannot be created via account tokens (error 1011)
#
# Manual configuration required via Cloudflare Dashboard:
# 1. Cache Rules: Bypass for /.well-known/*, /oidc/v1/*, /oauth/v2/*, /ui/*, /assets/*
# 2. Page Rules: 5 rules for paths above (or use Configuration Rules)
# 3. WAF Custom Rules: Skip for ZITADEL paths
#
# See infrastructure/CIPHER_CLOUDFLARE_HARDENING.md for complete steps


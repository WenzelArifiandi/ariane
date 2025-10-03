# Cipher OIDC Endpoint Hardening

## Summary

Added Cloudflare rules to ensure cipher.wenzelarifiandi.com OIDC endpoints work reliably and prevent "Application error" during logout.

## Changes Made

### 1. Cache Rules
Bypass cache for OIDC/OAuth endpoints to prevent stale responses:
- `/.well-known/*`
- `/oidc/v1/*`
- `/oauth/v2/*`

### 2. Page Rules
Disable features that could interfere with OIDC:
- Email obfuscation: OFF
- Rocket Loader: OFF
- Mirage: OFF
- Automatic HTTPS rewrites: OFF

### 3. WAF Bypass
Skip firewall rules for OIDC endpoints to prevent false positives.

## Health Check

Current status (2025-10-03):
```bash
curl -sS -D- "https://cipher.wenzelarifiandi.com/oidc/v1/end_session?client_id=340307158316941421&post_logout_redirect_uri=https%3A%2F%2Fwenzelarifiandi.cloudflareaccess.com%2Fcdn-cgi%2Faccess%2Flogout%3FreturnTo%3Dhttps%253A%252F%252Fwenzelarifiandi.com%252F"
```

Response:
- ✅ HTTP 302 Found
- ✅ Clean redirect to logout UI
- ✅ No "Application error"

## How to Apply

### Option 1: Manual Terraform Apply

```bash
cd infrastructure/terraform

# Set required variables
export TF_VAR_cloudflare_api_token="your_token"
export TF_VAR_cipher_client_id="340307158316941421"
export TF_VAR_cipher_client_secret="your_secret"

# Plan and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Option 2: GitHub Actions Workflow

If you have a workflow that deploys `infrastructure/terraform`, trigger it to apply these changes.

### Option 3: Manual Cloudflare Dashboard

If Terraform is not available, configure manually in Cloudflare Dashboard:

1. **Cache Rules** (Rules → Cache Rules):
   - Expression: `(http.host eq "cipher.wenzelarifiandi.com" and (starts_with(http.request.uri.path, "/.well-known/") or starts_with(http.request.uri.path, "/oidc/v1/") or starts_with(http.request.uri.path, "/oauth/v2/")))`
   - Action: Set cache settings → Cache: OFF

2. **Page Rules** (Rules → Page Rules):
   - Create 3 rules for:
     - `cipher.wenzelarifiandi.com/.well-known/*`
     - `cipher.wenzelarifiandi.com/oidc/v1/*`
     - `cipher.wenzelarifiandi.com/oauth/v2/*`
   - Settings for each:
     - Cache Level: Bypass
     - Email Obfuscation: Off
     - Rocket Loader: Off
     - Mirage: Off
     - Automatic HTTPS Rewrites: Off

3. **WAF Custom Rules** (Security → WAF → Custom rules):
   - Expression: `(http.host eq "cipher.wenzelarifiandi.com" and (starts_with(http.request.uri.path, "/.well-known/") or starts_with(http.request.uri.path, "/oidc/v1/") or starts_with(http.request.uri.path, "/oauth/v2/")))`
   - Action: Skip (all remaining custom rules)

## Verification

After applying, test the end_session endpoint:

```bash
# Should return HTTP 302 with Location header
curl -I "https://cipher.wenzelarifiandi.com/oidc/v1/end_session?client_id=340307158316941421&post_logout_redirect_uri=https%3A%2F%2Fwenzelarifiandi.cloudflareaccess.com%2Fcdn-cgi%2Faccess%2Flogout"
```

Expected response:
- HTTP 302 or 303
- Location header present
- No HTML error page

## Related Files

- `infrastructure/terraform/cloudflare.tf` - Terraform configuration
- `site/src/pages/logout.ts` - Unified logout flow
- `site/src/pages/api/zitadel/slo.ts` - Session revocation API
- `infrastructure/CLOUDFLARE_ACCESS_SETUP.md` - Access configuration docs

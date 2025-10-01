# Manual Fix for Cloudflare Access

## Problem

The `/cdn-cgi/access/get-identity` endpoint returns 404, which means Cloudflare Access is not active on auth.wenzelarifiandi.com.

This happened because:
1. Only the Application and Identity Provider were imported to Terraform
2. The policies were not imported
3. **Cloudflare Access requires at least one policy to be active**

## Solution

You have two options:

### Option 1: Delete and Recreate (Recommended)

1. **Delete existing resources from Cloudflare Dashboard:**
   - Go to https://dash.cloudflare.com → Zero Trust → Access → Applications
   - Delete "Cipher Application"
   - Go to Identity Providers → Delete "Cipher OIDC"
   - Go to Service Tokens → Delete "Cipher Service Token" (if exists)

2. **Run Terraform apply:**
   ```bash
   cd infrastructure/cloudflare-access
   terraform apply
   ```

   This will create all resources fresh with proper configuration.

3. **Verify:**
   ```bash
   curl -I https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity
   # Should return 401 or 403, NOT 404
   ```

### Option 2: Import the Missing Policies

The policies exist in Cloudflare but aren't in Terraform state. You need to import them:

1. **Get the policy IDs from the previous auto-discovery:**
   - Policy 1 (OIDC Users): `be65f06d-b4ec-4629-9da1-d1bf04be52a7`
   - Policy 2 (Service Token): `9986f955-5498-44f4-8a24-32489bb47eaa`

2. **Import them:**
   ```bash
   cd infrastructure/cloudflare-access
   terraform init

   # Set env vars
   export TF_VAR_cloudflare_api_token="<your_token>"
   export TF_VAR_cloudflare_account_id="<your_account_id>"
   export TF_VAR_cipher_client_id="<your_client_id>"
   export TF_VAR_cipher_client_secret="<your_client_secret>"

   # Import policies
   terraform import cloudflare_zero_trust_access_policy.cipher_oidc_policy \
     "$TF_VAR_cloudflare_account_id/2768b19d-a8a6-4866-b42f-f4881629edaf/be65f06d-b4ec-4629-9da1-d1bf04be52a7"

   terraform import cloudflare_zero_trust_access_policy.cipher_service_policy \
     "$TF_VAR_cloudflare_account_id/2768b19d-a8a6-4866-b42f-f4881629edaf/9986f955-5498-44f4-8a24-32489bb47eaa"

   # Import service token if it exists
   terraform import cloudflare_zero_trust_access_service_token.cipher_service_token \
     "$TF_VAR_cloudflare_account_id/<TOKEN_ID>"

   # Apply to update CORS
   terraform apply
   ```

3. **Verify:**
   ```bash
   curl -I https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity
   # Should return 401 or 403 (not authenticated)
   ```

## Why This Happened

Cloudflare Access applications require:
1. An Application resource
2. An Identity Provider
3. **At least one Access Policy** ← This was missing in Terraform state

Without a policy, the Access application exists but is not active, so `/cdn-cgi/access/*` endpoints return 404.

## After Fixing

Once Access is active, test the auth flow:
1. Visit https://wenzelarifiandi.com
2. Click Maker button
3. Should redirect to Cloudflare Access login
4. Authenticate via Zitadel
5. Return to wenzelarifiandi.com
6. Click Maker again → menu opens

## Testing Endpoints

```bash
# Should return 401/403 when not authenticated
curl -I https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity

# Should redirect to identity provider login
curl -I "https://auth.wenzelarifiandi.com/"

# With valid CF_Authorization cookie, should return user info
curl -H "Cookie: CF_Authorization=<token>" https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity
```

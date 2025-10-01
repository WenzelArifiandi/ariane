# Manual Import Commands

Based on the auto-discovery, here are the exact import commands to run:

## Discovered Resource IDs

- **Application ID**: `2768b19d-a8a6-4866-b42f-f4881629edaf`
- **Identity Provider ID**: `8dea90ab-5226-4b41-b8a0-3e9db7d91c7e`
- **Policy IDs**: (from API discovery)
  - Policy 1: `be65f06d-b4ec-4629-9da1-d1bf04be52a7`
  - Policy 2: `9986f955-5498-44f4-8a24-32489bb47eaa`

## Import Commands

Run these commands from the `infrastructure/cloudflare-access` directory:

```bash
# 1. Set environment variables
export TF_VAR_cloudflare_api_token="<your_cloudflare_api_token>"
export TF_VAR_cloudflare_account_id="<your_cloudflare_account_id>"
export TF_VAR_cipher_client_id="<your_cipher_client_id>"
export TF_VAR_cipher_client_secret="<your_cipher_client_secret>"

# 2. Initialize Terraform
terraform init

# 3. Import Access Application
terraform import \
  cloudflare_zero_trust_access_application.cipher \
  "$TF_VAR_cloudflare_account_id/2768b19d-a8a6-4866-b42f-f4881629edaf"

# 4. Import Identity Provider
terraform import \
  cloudflare_zero_trust_access_identity_provider.cipher_oidc \
  "$TF_VAR_cloudflare_account_id/8dea90ab-5226-4b41-b8a0-3e9db7d91c7e"

# 5. Import Access Policies
terraform import \
  cloudflare_zero_trust_access_policy.cipher_oidc_policy \
  "$TF_VAR_cloudflare_account_id/2768b19d-a8a6-4866-b42f-f4881629edaf/be65f06d-b4ec-4629-9da1-d1bf04be52a7"

terraform import \
  cloudflare_zero_trust_access_policy.cipher_service_policy \
  "$TF_VAR_cloudflare_account_id/2768b19d-a8a6-4866-b42f-f4881629edaf/9986f955-5498-44f4-8a24-32489bb47eaa"

# 6. Optionally import Service Token (if it exists)
# First, get the service token ID:
# curl -s -H "Authorization: Bearer $TF_VAR_cloudflare_api_token" \
#   "https://api.cloudflare.com/client/v4/accounts/$TF_VAR_cloudflare_account_id/access/service_tokens" | jq '.result'
#
# Then import with:
# terraform import \
#   cloudflare_zero_trust_access_service_token.cipher_service_token \
#   "$TF_VAR_cloudflare_account_id/<TOKEN_ID>"

# 7. Verify imports
terraform state list

# 8. Check for drift
terraform plan
```

## Alternative: Using GitHub Actions (if secrets are configured)

You can also do this manually via GitHub Actions. Create a new workflow run with manual dispatch that runs these commands.

## After Import

Once imported, run:
```bash
terraform plan
```

This will show you if there are any differences between your Terraform configuration and the actual resources.

If everything looks good:
```bash
terraform apply
```

## Notes

- The import format for policies is: `<account_id>/<application_id>/<policy_id>`
- Service tokens can only be imported if you have the token ID (cannot be retrieved after creation)
- After import, the GitHub Actions workflow should work correctly

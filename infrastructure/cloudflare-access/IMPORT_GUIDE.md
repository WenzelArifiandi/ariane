# Resolving application_already_exists (11010) Error

This guide helps you import existing Cloudflare Access resources and resolve the `application_already_exists` error.

## 🎯 Quick Resolution Steps

### 1. Set Required Environment Variables

```bash
export TF_VAR_cloudflare_api_token="your_cloudflare_api_token"
export TF_VAR_cloudflare_account_id="your_cloudflare_account_id"
export TF_VAR_cipher_client_id="your_cipher_client_id"
export TF_VAR_cipher_client_secret="your_cipher_client_secret"
```

### 2. Discover and Import Existing Resources

```bash
# Run the automated discovery script
./import-existing-resources.sh

# The script will show you import commands like:
# terraform import cloudflare_zero_trust_access_application.auth accounts/abc123/def456
# terraform import cloudflare_zero_trust_access_identity_provider.cipher_oidc accounts/abc123/ghi789
```

### 3. Run the Import Commands

Copy and run each import command shown by the discovery script:

```bash
# Example - replace with actual IDs from the script output
terraform import cloudflare_zero_trust_access_application.auth accounts/<ACCOUNT_ID>/<APP_ID>
terraform import cloudflare_zero_trust_access_identity_provider.cipher_oidc accounts/<ACCOUNT_ID>/<IDP_ID>
terraform import cloudflare_zero_trust_access_service_token.cipher_service_token accounts/<ACCOUNT_ID>/<TOKEN_ID>
```

### 4. Verify and Plan

```bash
# Check what Terraform sees after import
terraform plan

# Look for any differences between your config and existing resources
# You may need to adjust some attributes in main.tf to match
```

### 5. Apply Changes

```bash
# Apply any needed updates
terraform apply

# Or if everything looks good, no changes should be needed
```

## 🔧 Key Changes Made

- ✅ **Updated to account-scoped resources**: All resources now use `account_id` instead of `zone_id`
- ✅ **Added import discovery script**: Automatically finds existing resources via API
- ✅ **Removed workflow targeting**: No more `-target` usage, full terraform operations
- ✅ **Added account_id validation**: Environment variable validation for account ID

## 🎭 Resource Mapping

| Terraform Resource                                                | Import Format                       |
| ----------------------------------------------------------------- | ----------------------------------- |
| `cloudflare_zero_trust_access_application.auth`                 | `accounts/<ACCOUNT_ID>/<APP_ID>`    |
| `cloudflare_zero_trust_access_identity_provider.cipher_oidc`      | `accounts/<ACCOUNT_ID>/<IDP_ID>`    |
| `cloudflare_zero_trust_access_service_token.cipher_service_token` | `accounts/<ACCOUNT_ID>/<TOKEN_ID>`  |
| `cloudflare_zero_trust_access_policy.cipher_oidc_policy`          | `accounts/<ACCOUNT_ID>/<POLICY_ID>` |

## 🚨 Important Notes

- **Account-scoped is preferred**: Better for organization-wide Access management
- **Import preserves existing resources**: No downtime or resource recreation
- **Policies may need adjustment**: Policy names/precedence might need tweaking
- **Service tokens are sensitive**: Handle client secrets carefully after import

## 🔍 Verification

After successful import and apply:

1. Visit https://auth.wenzelarifiandi.com
2. Should redirect to Cloudflare Access login
3. OIDC authentication should work via ZITADEL
4. No `application_already_exists` errors in future deployments

## 💡 Pro Tips

- **Run discovery script first**: Always check what exists before creating new resources
- **Use account scope**: Better for multi-domain Access management
- **Import incrementally**: Import one resource type at a time if issues occur
- **Check dashboard**: Verify import success in Cloudflare Zero Trust dashboard

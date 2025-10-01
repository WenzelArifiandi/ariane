# Cloudflare Access - Local Development Guide

This directory contains Terraform configuration for Cloudflare Zero Trust Access setup for `auth.wenzelarifiandi.com`.

## 🚀 Quick Start

### Option 1: Environment Variables (Recommended)

Set these environment variables before running Terraform:

````bash
export TF_VAR_cloudflare_api_token="your_api_token_here"
export TF_VAR_cloudflare_account_id="your_account_id_here"
export TF_VAR_cipher_client_id="your_client_id_here"
export TF_VAR_cipher_client_secret="your_client_secret_here"

# Check for existing resources and import if needed
./import-existing-resources.sh

# Now run terraform without prompts
terraform init
terraform plan
terraform apply
```### Option 2: terraform.tfvars File

1. **Copy the example file:**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
````

2. **Edit terraform.tfvars** with your actual values:

   ```hcl
   cloudflare_api_token  = "your_actual_api_token"
   cloudflare_account_id = "your_actual_account_id"
   cipher_client_id      = "your_actual_client_id"
   cipher_client_secret  = "your_actual_client_secret"
   ```

3. **Run Terraform:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## 🔑 Getting Required Credentials

### Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Zone:Zone:Read, Zone:DNS:Edit, Account:Cloudflare Access:Edit" permissions
4. Include your zone: `wenzelarifiandi.com`

### Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Look at the right sidebar - your Account ID is displayed there
3. It looks like: `1234567890abcdef1234567890abcdef`

### Cipher OIDC Credentials

1. Access your ZITADEL instance at `cipher.wenzelarifiandi.com`
2. Go to your OIDC application configuration
3. Copy the `Client ID` and `Client Secret`

## 🛠️ Development Workflow

### Local Development

```bash
# Set environment variables (add to your ~/.zshrc or ~/.bashrc)
export TF_VAR_cloudflare_api_token="xxx"
export TF_VAR_cloudflare_account_id="xxx"
export TF_VAR_cipher_client_id="xxx"
export TF_VAR_cipher_client_secret="xxx"

# Import any existing resources first
cd infrastructure/cloudflare-access
./import-existing-resources.sh

# Run terraform
terraform plan
```

### CI/CD (GitHub Actions)

The workflow automatically uses GitHub Secrets:

- `TERRAFORM_ACCESS` → `TF_VAR_cloudflare_api_token`
- `CIPHER_CLIENT_ID` → `TF_VAR_cipher_client_id`
- `CIPHER_CLIENT_SECRET` → `TF_VAR_cipher_client_secret`

## 📋 Resources Created

- **Access Application**: `auth.wenzelarifiandi.com`
- **OIDC Identity Provider**: Cipher ZITADEL integration
- **Access Policies**: Allow OIDC users + Service token access
- **Service Token**: For programmatic API access
- **CORS Configuration**: Supports localhost development

## � Importing Existing Resources

If you already have Access resources for `auth.wenzelarifiandi.com`, you need to import them first:

### Automatic Discovery & Import

```bash
# Set your credentials first
export TF_VAR_cloudflare_api_token="your_token"
export TF_VAR_cloudflare_account_id="your_account_id"

# Run the discovery script
./import-existing-resources.sh

# Follow the import commands shown by the script
# Example outputs:
# terraform import cloudflare_zero_trust_access_application.auth accounts/abc123/def456
# terraform import cloudflare_zero_trust_access_identity_provider.cipher_oidc accounts/abc123/ghi789
```

### Manual Import Process

1. **Find existing resources** in [Cloudflare Dashboard](https://dash.cloudflare.com) → Zero Trust → Access
2. **Import Access Application**:
   ```bash
   terraform import cloudflare_zero_trust_access_application.auth accounts/<ACCOUNT_ID>/<APP_ID>
   ```
3. **Import Identity Provider**:
   ```bash
   terraform import cloudflare_zero_trust_access_identity_provider.cipher_oidc accounts/<ACCOUNT_ID>/<IDP_ID>
   ```
4. **Import Service Token** (if exists):
   ```bash
   terraform import cloudflare_zero_trust_access_service_token.cipher_service_token accounts/<ACCOUNT_ID>/<TOKEN_ID>
   ```

### Post-Import Steps

1. Run `terraform plan` to see what needs to be updated
2. Adjust configuration in `main.tf` to match existing resource attributes
3. Run `terraform apply` to align state

## �🔍 Validation

After deployment, test the setup:

1. **Visit**: https://auth.wenzelarifiandi.com
2. **Should redirect** to Cloudflare Access login
3. **Select**: "Cipher OIDC" provider
4. **Authenticate** via ZITADEL
5. **Access granted** to protected application

## 📝 Notes

- `terraform.tfvars` is gitignored for security
- Environment variables take precedence over tfvars file
- All sensitive values are marked as `sensitive = true`
- Configuration validates input requirements

## 🐛 Troubleshooting

### "Error 12130: Invalid tag reference"

- Fixed by removing tag resources (account ID not required)

### "auto_redirect_to_identity requires allowed_idps"

- Fixed by adding `allowed_idps = [cipher_oidc_provider.id]`

### "Missing required variables"

- Set environment variables or create terraform.tfvars file
- Check variable validation error messages for guidance

### "Error 11010: application_already_exists"

- An Access application for `auth.wenzelarifiandi.com` already exists
- Use the import script: `./import-existing-resources.sh`
- Follow the import commands to bring existing resources into Terraform state

### "Resource not found" after import

- The resource may have been deleted or moved
- Re-run the discovery script to find current resource IDs
- Check the Cloudflare dashboard to verify resource existence

# Cloudflare Access - Local Development Guide

This directory contains Terraform configuration for Cloudflare Zero Trust Access setup for `cipher.wenzelarifiandi.com`.

## 🚀 Quick Start

### Option 1: Environment Variables (Recommended)

Set these environment variables before running Terraform:

```bash
export TF_VAR_cloudflare_api_token="your_api_token_here"
export TF_VAR_cipher_client_id="your_client_id_here"
export TF_VAR_cipher_client_secret="your_client_secret_here"

# Now run terraform without prompts
terraform init
terraform plan
terraform apply
```

### Option 2: terraform.tfvars File

1. **Copy the example file:**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars** with your actual values:

   ```hcl
   cloudflare_api_token = "your_actual_api_token"
   cipher_client_id     = "your_actual_client_id"
   cipher_client_secret = "your_actual_client_secret"
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

### Cipher OIDC Credentials

1. Access your ZITADEL instance at `cipher.wenzelarifiandi.com`
2. Go to your OIDC application configuration
3. Copy the `Client ID` and `Client Secret`

## 🛠️ Development Workflow

### Local Development

```bash
# Set environment variables (add to your ~/.zshrc or ~/.bashrc)
export TF_VAR_cloudflare_api_token="xxx"
export TF_VAR_cipher_client_id="xxx"
export TF_VAR_cipher_client_secret="xxx"

# Run terraform
cd infrastructure/cloudflare-access
terraform plan
```

### CI/CD (GitHub Actions)

The workflow automatically uses GitHub Secrets:

- `TERRAFORM_ACCESS` → `TF_VAR_cloudflare_api_token`
- `CIPHER_CLIENT_ID` → `TF_VAR_cipher_client_id`
- `CIPHER_CLIENT_SECRET` → `TF_VAR_cipher_client_secret`

## 📋 Resources Created

- **Access Application**: `cipher.wenzelarifiandi.com`
- **OIDC Identity Provider**: Cipher ZITADEL integration
- **Access Policies**: Allow OIDC users + Service token access
- **Service Token**: For programmatic API access
- **CORS Configuration**: Supports localhost development

## 🔍 Validation

After deployment, test the setup:

1. **Visit**: https://cipher.wenzelarifiandi.com
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

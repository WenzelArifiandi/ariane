# Cloudflare Access Setup for cipher.wenzelarifiandi.com

This configuration sets up Cloudflare Access to protect `cipher.wenzelarifiandi.com` using ZITADEL as the OIDC identity provider.

## 🏗️ Architecture

```
Internet → Cloudflare Access → ZITADEL OIDC → cipher.wenzelarifiandi.com
```

## 📋 Prerequisites

### 1. GitHub Secrets Configuration

Set up the following secrets in your GitHub repository (`Settings > Secrets and variables > Actions`):

```bash
# Required secrets
TERRAFORM_ACCESS         # Cloudflare API token with Access:Edit permissions
ZITADEL_CLIENT_ID        # OIDC client ID from ZITADEL
ZITADEL_CLIENT_SECRET    # OIDC client secret from ZITADEL
```

### 2. Cloudflare API Token Setup

Create a Cloudflare API token with these permissions:

- **Zone:Zone:Read** (wenzelarifiandi.com)
- **Access:Edit** (All zones or wenzelarifiandi.com)
- **Zone:Zone Settings:Edit** (wenzelarifiandi.com)

```bash
# Test your token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones" | jq '.result[] | {name, id}'
```

### 3. ZITADEL OIDC Application Setup

In your ZITADEL instance (`https://auth.wenzelarifiandi.com`):

1. **Create Application**:

   - Type: Web Application
   - Redirect URIs: `https://cipher.wenzelarifiandi.com/cdn-cgi/access/callback`
   - Scopes: `openid`, `profile`, `email`

2. **Note the credentials**:
   - Client ID
   - Client Secret

## 🚀 Deployment

### Automatic Deployment (Recommended)

The workflow triggers automatically on push to main:

```bash
git add .
git commit -m "feat: add Cloudflare Access for cipher.wenzelarifiandi.com"
git push origin main
```

### Manual Deployment

```bash
# Plan the deployment
gh workflow run cloudflare-access.yml -f action=plan

# Apply the configuration
gh workflow run cloudflare-access.yml -f action=apply

# Destroy (if needed)
gh workflow run cloudflare-access.yml -f action=destroy
```

### Local Development

```bash
cd infrastructure/terraform

# Set environment variables
export TF_VAR_cloudflare_api_token="your_cloudflare_token"
export TF_VAR_zitadel_client_id="your_zitadel_client_id"
export TF_VAR_zitadel_client_secret="your_zitadel_client_secret"

# Initialize and plan
terraform init
terraform plan -target="module.cloudflare_access"

# Apply targeted resources
terraform apply \
  -target="cloudflare_access_application.cipher" \
  -target="cloudflare_access_identity_provider.zitadel_oidc" \
  -target="cloudflare_access_policy.cipher_zitadel_policy"
```

## 📊 Resources Created

### 1. Access Application

- **Domain**: cipher.wenzelarifiandi.com
- **Type**: Self-hosted
- **Session Duration**: 24 hours
- **CORS**: Configured for web applications

### 2. Identity Provider

- **Name**: ZITADEL OIDC
- **Type**: OpenID Connect
- **Issuer**: https://auth.wenzelarifiandi.com
- **Scopes**: `openid`, `profile`, `email`

### 3. Access Policies

- **ZITADEL Users Policy**: Allows authenticated ZITADEL users
- **Service Token Policy**: Allows programmatic access via service token

### 4. Service Token

- **Purpose**: Programmatic access to the application
- **Usage**: API automation, health checks, etc.

## 🔐 Access URLs

After deployment, these URLs will be active:

- **Application**: https://cipher.wenzelarifiandi.com
- **Access Login**: https://cipher.wenzelarifiandi.com/cdn-cgi/access/login
- **ZITADEL Auth**: https://auth.wenzelarifiandi.com

## 🧪 Testing Access

### User Authentication Flow

1. Navigate to `https://cipher.wenzelarifiandi.com`
2. Cloudflare Access intercepts the request
3. Redirects to ZITADEL login
4. User authenticates with ZITADEL
5. ZITADEL redirects back to Cloudflare Access
6. Access grants access to the application

### Service Token Usage

```bash
# Using the service token for API access
CLIENT_ID="your_service_token_client_id"
CLIENT_SECRET="your_service_token_client_secret"

curl -H "CF-Access-Client-Id: $CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CLIENT_SECRET" \
     "https://cipher.wenzelarifiandi.com/api/health"
```

## 🔧 Configuration Files

```
infrastructure/terraform/
├── cloudflare.tf              # Main Cloudflare resources
├── providers.tf               # Provider configuration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output values
└── terraform.tfvars.example   # Example configuration
```

## 🚨 Security Considerations

### 1. Secrets Management

- ✅ API tokens stored in GitHub secrets
- ✅ No hardcoded credentials in code
- ✅ Sensitive outputs marked appropriately

### 2. Access Control

- ✅ OIDC authentication required
- ✅ Domain-specific access policies
- ✅ Session duration limits (24h)

### 3. Network Security

- ✅ CORS configured for specific domain
- ✅ HTTPS-only configuration
- ✅ Service token for programmatic access

## 📖 Troubleshooting

### Common Issues

**❌ "Access Denied" Error**

```bash
# Check policy configuration
terraform output cloudflare_access_application

# Verify ZITADEL application settings
# Ensure redirect URI matches: https://cipher.wenzelarifiandi.com/cdn-cgi/access/callback
```

**❌ "Invalid OIDC Configuration"**

```bash
# Verify ZITADEL issuer URL
curl https://auth.wenzelarifiandi.com/.well-known/openid-configuration

# Check client credentials in ZITADEL console
```

**❌ "Service Token Not Working"**

```bash
# Get service token credentials
terraform output -json cloudflare_access_service_token

# Test with correct headers
curl -H "CF-Access-Client-Id: CLIENT_ID" \
     -H "CF-Access-Client-Secret: CLIENT_SECRET" \
     "https://cipher.wenzelarifiandi.com"
```

### Logs and Monitoring

```bash
# Check Cloudflare Access logs
# Go to Cloudflare Dashboard > Access > Logs

# Monitor authentication events
# Check ZITADEL admin console for login events
```

## 🔄 Updates and Maintenance

### Rotating Service Tokens

```bash
# Plan rotation
terraform plan -replace="cloudflare_access_service_token.cipher_service_token"

# Apply rotation
terraform apply -replace="cloudflare_access_service_token.cipher_service_token"
```

### Updating Policies

Edit `infrastructure/terraform/cloudflare.tf` and run:

```bash
terraform plan
terraform apply
```

## 📚 References

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/)
- [ZITADEL OIDC Guide](https://zitadel.com/docs/guides/integrate/login/oidc)
- [Terraform Cloudflare Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)

# Cloudflare Access - Simplified Setup

Clean, single-source-of-truth Terraform configuration for protecting `/maker` endpoint.

## What's Protected

- **Path**: `wenzelarifiandi.com/maker`
- **Authentication**: Cipher OIDC (ZITADEL)
- **Session**: 24 hours

## Resources

1. **Identity Provider** (`cipher_oidc`)
   - Type: OIDC
   - Provider: Cipher/ZITADEL
   - Scopes: openid, profile, email

2. **Access Application** (`maker`)
   - Domain: wenzelarifiandi.com/maker
   - Session: 24h
   - Skip interstitial: Yes

3. **Access Policy** (`maker_policy`)
   - Rule: Allow Cipher OIDC authenticated users
   - Session: 24h

## Authentication Flow

1. User clicks "Maker" button on homepage
2. Client checks auth with HEAD request to `/maker`
3. If not authenticated → redirect to `/maker`
4. Cloudflare Access intercepts → shows login (wenzelarifiandi.cloudflareaccess.com)
5. User authenticates via Cipher/ZITADEL
6. After successful auth → `/maker` endpoint returns 302 to `/?maker=open`
7. Homepage auto-opens Maker menu

## Deployment

Changes are automatically applied when merged to `main`:

```bash
# The workflow handles:
1. terraform init
2. Import existing resources (idempotent)
3. terraform plan
4. terraform apply (on push to main)
```

### Manual Deployment

```bash
gh workflow run cloudflare-access.yml --field action=apply
```

## Configuration

All configuration is in:
- `main.tf` - Resources
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `ensure-imports.sh` - Auto-import existing resources

### Required Secrets (GitHub Environment: prod)

- `TERRAFORM_ACCESS` - Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `CIPHER_CLIENT_ID` - ZITADEL client ID
- `CIPHER_CLIENT_SECRET` - ZITADEL client secret

## State Management

> **Note**: Currently using local state in CI. Each run imports existing resources before applying changes. This works but isn't ideal for frequent updates.

**Future improvement**: Add remote state backend (Terraform Cloud, S3, etc.)

## Testing

```bash
# Test that /maker is protected
curl -I https://wenzelarifiandi.com/maker
# Should return: 302 redirect to Cloudflare Access login

# Test after authentication (with valid CF_Authorization cookie)
curl -I https://wenzelarifiandi.com/maker -H "Cookie: CF_Authorization=..."
# Should return: 302 redirect to /?maker=open
```

## Troubleshooting

### "Application already exists" error

This is expected! The `ensure-imports.sh` script automatically imports existing resources before each apply. The workflow handles this gracefully.

### Terraform state not preserved

Currently using local state. Each workflow run starts fresh and imports existing resources. This is intentional to avoid state management complexity in CI.

### Auth flow not working

1. Check `/maker` endpoint returns 302 to Cloudflare Access
2. Verify Cipher OIDC is configured correctly
3. Check browser console for CORS errors
4. Ensure `Nav.astro` is using the simplified redirect flow

## What Changed (Cleanup Summary)

**Removed:**
- ❌ `auth.wenzelarifiandi.com` Access app (unnecessary)
- ❌ DNS CNAME `auth → cipher` (confusing)
- ❌ Service tokens (unused)
- ❌ Multiple import/cleanup workflows
- ❌ Manual Cloudflare Access URL construction in Nav.astro

**Kept:**
- ✅ `wenzelarifiandi.com/maker` Access app
- ✅ Cipher OIDC identity provider
- ✅ Single access policy
- ✅ One clean workflow
- ✅ Simple redirect-based auth flow

**Result**: 620 lines removed, single source of truth established.

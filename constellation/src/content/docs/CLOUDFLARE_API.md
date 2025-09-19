---
title: Cloudflare API Token Setup
description: "# Cloudflare API Token Setup"
slug: cloudflare_api
---

# Cloudflare API Token Setup

This guide walks you through creating a Cloudflare API token for cert-manager to automatically manage Let's Encrypt certificates via DNS-01 challenge.

## Required Permissions

The API token needs these permissions for automatic certificate management:

- **Zone:Zone:Read** - Read zone information
- **Zone:DNS:Edit** - Create/update DNS TXT records for ACME challenges
- **Zone Resources**: Include specific zone `wenzelarifiandi.com`

## Step-by-Step Setup

### 1. Access Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Login to your account
3. Navigate to **My Profile** (top right) → **API Tokens**

### 2. Create Custom Token

1. Click **Create Token**
2. Select **Custom token** (not Global API Key)
3. Configure the token:

```
Token name: ariane-cert-manager
Permissions:
  - Zone:Zone:Read
  - Zone:DNS:Edit
Zone Resources:
  - Include: Specific zone: wenzelarifiandi.com
Client IP Address Filtering: (leave empty for any IP)
TTL: (leave empty for no expiration)
```

### 3. Generate and Copy Token

1. Click **Continue to summary**
2. Review permissions
3. Click **Create Token**
4. **IMPORTANT**: Copy the token immediately - it won't be shown again

The token will look like: `1234567890abcdef1234567890abcdef12345678`

### 4. Test the Token

Verify the token works:

```bash
# Test zone access
curl -X GET "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Should return zone information for wenzelarifiandi.com
```

### 5. Store Securely

Add the token to your secrets file:

```bash
cd infrastructure/ansible
sops secrets/cell-v0.yml
# Add: cloudflare_api_token: "YOUR_TOKEN_HERE"
```

## Security Best Practices

- **Principle of Least Privilege**: Token only has DNS edit permissions for one zone
- **Rotation**: Consider rotating the token periodically
- **Monitoring**: Check Cloudflare audit logs for unexpected API usage
- **Revocation**: If compromised, revoke immediately from Cloudflare dashboard

## Troubleshooting

### Common Issues

**403 Forbidden Error**:
- Check token has correct permissions
- Verify zone name matches exactly
- Ensure token hasn't expired

**DNS Challenge Timeout**:
- Check Cloudflare API status
- Verify DNS propagation with `dig TXT _acme-challenge.auth.wenzelarifiandi.com`
- Check cert-manager logs: `kubectl logs -n cert-manager deployment/cert-manager`

**Token Not Working**:
```bash
# Debug cert-manager
kubectl describe certificate -n zitadel zitadel-tls
kubectl describe certificaterequest -n zitadel
kubectl logs -n cert-manager deployment/cert-manager
```

## Token Permissions Summary

| Permission | Access Level | Resource | Purpose |
|------------|--------------|----------|---------|
| Zone:Zone:Read | Read | wenzelarifiandi.com | Get zone ID for DNS operations |
| Zone:DNS:Edit | Edit | wenzelarifiandi.com | Create/delete TXT records for ACME |

This minimal permission set ensures the token can only manage DNS records for certificate validation and nothing else.
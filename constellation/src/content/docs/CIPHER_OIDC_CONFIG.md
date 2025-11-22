---
title: Cipher (ZITADEL) OIDC Configuration Guide
slug: cipher_oidc_config
description: "# Cipher (ZITADEL) OIDC Configuration Guide"
---



# Cipher (ZITADEL) OIDC Configuration Guide

## Problem

After authenticating via Cipher/ZITADEL, users are redirected to `auth.wenzelarifiandi.com` instead of back to the original site at `wenzelarifiandi.com`.

## Root Cause

The Post Logout URIs in the Cipher OIDC application are not configured to redirect back to the main site.

## Solution: Update Cipher OIDC Application Settings

### 1. Access your Cipher/ZITADEL Console

- Go to your ZITADEL instance (e.g., `https://your-zitadel.com`)
- Navigate to Projects → Your Project → Applications → Your OIDC App

### 2. Configure Redirect URIs

Add these to the **Redirect URIs** section:

```
https://auth.wenzelarifiandi.com/cdn-cgi/access/callback
https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback
```

### 3. Configure Post Logout URIs

Add these to the **Post Logout URIs** section:

```
https://wenzelarifiandi.com
https://wenzelarifiandi.com/
http://localhost:4321
http://localhost:4321/
```

### 4. Configure Origins (for CORS)

Add these to the **Origins** section:

```
https://wenzelarifiandi.com
https://auth.wenzelarifiandi.com
http://localhost:4321
```

### 5. Save Configuration

Make sure to save the changes in ZITADEL.

## How the Flow Should Work After Fix

1. **User clicks Maker button** (unauthenticated)
2. **Redirected to** `https://auth.wenzelarifiandi.com`
3. **Cloudflare Access** redirects to ZITADEL for authentication
4. **User authenticates** with ZITADEL
5. **ZITADEL redirects back** to Cloudflare Access callback
6. **Cloudflare Access** sets authentication cookies
7. **User is redirected** to `https://wenzelarifiandi.com` (from Post Logout URIs)
8. **User clicks Maker again** → Menu opens (now authenticated)

## Testing the Fix

After updating the ZITADEL configuration:

1. Open an incognito/private browser window
2. Go to `https://wenzelarifiandi.com`
3. Click the Maker button
4. Complete authentication
5. You should be redirected back to `https://wenzelarifiandi.com`
6. Click Maker button again → dropdown should open

## Alternative: Manual Return Flow

If automatic redirect doesn't work, our code includes a fallback:

- Users authenticate on `auth.wenzelarifiandi.com`
- They manually navigate back to `wenzelarifiandi.com`
- Our code detects they're authenticated and works normally

## Troubleshooting

### Still redirecting to auth domain?

- Double-check Post Logout URIs in ZITADEL
- Ensure you saved the configuration
- Try clearing browser cookies and testing again

### CORS errors?

- Verify Origins are set correctly in ZITADEL
- Check browser console for specific error messages

### Authentication not persisting?

- Cookies might be domain-scoped incorrectly
- Check that Cloudflare Access is setting cookies for `.wenzelarifiandi.com`

## Current Terraform Configuration

Our Cloudflare Access configuration (in `infrastructure/cloudflare-access/main.tf`) already includes:

```hcl
resource "cloudflare_zero_trust_access_identity_provider" "cipher_oidc" {
  config {
    client_id     = var.cipher_client_id
    client_secret = var.cipher_client_secret
    auth_url      = "${var.cipher_issuer_url}/oauth/v2/authorize"
    token_url     = "${var.cipher_issuer_url}/oauth/v2/token"
    certs_url     = "${var.cipher_issuer_url}/oauth/v2/keys"
  }
}
```

The main fix needed is in the ZITADEL/Cipher configuration, not in Terraform.

# Cloudflare Access Redirect Configuration Guide

## The Problem

After authentication via Cipher/ZITADEL, users are redirected to `auth.wenzelarifiandi.com` instead of back to `wenzelarifiandi.com`.

## Understanding Cloudflare Access Redirect URLs

Cloudflare Access has several redirect/URL configuration options:

### 1. **Block Page Redirect** (for denied access)

```hcl
resource "cloudflare_zero_trust_access_application" "auth" {
  custom_deny_url     = "https://wenzelarifiandi.com"  # Where to send DENIED users
  custom_deny_message = "Access denied"
}
```

### 2. **Authentication Flow Redirect** (for successful auth)

This is controlled by:

- The `redirect_url` parameter in the auth request
- OIDC Post Logout URIs in Cipher/ZITADEL
- Cloudflare Access callback handling

## Current Issue Analysis

Looking at your curl test:

```bash
curl -I "https://auth.wenzelarifiandi.com/"
# Returns: location: https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/login/...
# With: "redirect_url":"/"
```

The `"redirect_url":"/"` means Cloudflare Access will redirect to `/` **relative to the auth domain** (`auth.wenzelarifiandi.com/`) instead of the original site.

## Solutions

### Solution 1: Fix the Authentication Request (Recommended)

Update the Nav.astro to pass the correct redirect URL:

```javascript
function redirectToAccessLogin() {
  // Pass the original site as the redirect destination
  const returnUrl =
    window.location.origin === "http://localhost:4321"
      ? "http://localhost:4321"
      : "https://wenzelarifiandi.com";
  const redirectUrl = encodeURIComponent(returnUrl);
  window.location.href = `${CF_ACCESS_BASE_URL}/cdn-cgi/access/login?redirect_url=${redirectUrl}`;
}
```

### Solution 2: Configure Cipher/ZITADEL Properly

In your Cipher/ZITADEL OIDC application:

**Post Logout URIs:**

```
https://wenzelarifiandi.com
https://wenzelarifiandi.com/
http://localhost:4321
```

**Redirect URIs:**

```
https://auth.wenzelarifiandi.com/cdn-cgi/access/callback
https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback
```

### Solution 3: Use Cloudflare Access Advanced Settings

In Terraform, we can configure additional settings:

```hcl
resource "cloudflare_zero_trust_access_application" "auth" {
  # ... existing config ...

  # Advanced settings that might help with redirects
  skip_interstitial = true  # Skip intermediate pages

  # Custom deny URL for failed auth (not successful auth)
  custom_deny_url = "https://wenzelarifiandi.com"

  # CORS settings to allow cross-origin auth checks
  cors_headers {
    allowed_origins   = ["https://wenzelarifiandi.com", "http://localhost:4321"]
    allowed_methods   = ["GET", "POST", "OPTIONS"]
    allow_credentials = true
  }
}
```

## Testing the Fix

After implementing the solutions:

1. **Test with proper redirect URL:**

   ```bash
   curl -I "https://auth.wenzelarifiandi.com/cdn-cgi/access/login?redirect_url=https%3A//wenzelarifiandi.com"
   ```

2. **Expected flow:**

   - User clicks Maker → redirected to auth with `redirect_url=https://wenzelarifiandi.com`
   - User authenticates with Cipher/ZITADEL
   - Cipher redirects back to Cloudflare Access callback
   - Cloudflare Access redirects to the `redirect_url` (wenzelarifiandi.com)

3. **Verify in browser:**
   - Open incognito window
   - Go to wenzelarifiandi.com
   - Click Maker button
   - Complete authentication
   - Should return to wenzelarifiandi.com

## Current Status

✅ **Terraform Configuration**: Updated with proper deny URL and CORS settings
⚠️ **Authentication Request**: Need to pass correct redirect_url parameter
⚠️ **Cipher Configuration**: Need to verify Post Logout URIs include wenzelarifiandi.com

## Next Steps

1. **Test the updated Nav.astro** with proper redirect_url parameter
2. **Verify Cipher/ZITADEL configuration** has correct Post Logout URIs
3. **Deploy Terraform changes** to update Cloudflare Access settings
4. **Test end-to-end flow** to confirm users return to original site

## Troubleshooting

### Still redirecting to auth domain?

- Check that `redirect_url` parameter is being passed correctly
- Verify Cipher Post Logout URIs include the target domain
- Check browser network tab to see the actual redirect chain

### 404 on /cdn-cgi/access/login?

- The Cloudflare Access application might not be fully deployed
- Try the root domain redirect approach as a fallback
- Check Cloudflare Access dashboard for application status

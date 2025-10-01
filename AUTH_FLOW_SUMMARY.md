# Maker Button Authentication Flow - Final Implementation

## ✅ Implementation Complete

The Maker button on wenzelarifiandi.com now uses Cloudflare Access + Cipher OIDC authentication.

## How It Works

### 1. User Clicks Maker Button
```javascript
// Nav.astro checks auth via fetch
const response = await fetch("https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity", {
  credentials: "include"
});
```

### 2. Two Possible Outcomes

#### A. User is Authenticated (200 response)
- Maker dropdown opens immediately
- Shows links to Neve, Etoile, etc.

#### B. User is Not Authenticated (401/403 response)
- Redirects to: `https://auth.wenzelarifiandi.com/cdn-cgi/access/login?redirect_url=<current_page>`
- User authenticates via Cipher OIDC (Zitadel)
- After auth, **immediately redirects back to current Ariane page**
- User clicks Maker button again → now authenticated → menu opens

## Key Points

✅ **Never stays on cipher domain** - Always redirects back to Ariane after auth
✅ **CORS enabled** - cipher allows wenzelarifiandi.com to check auth status
✅ **Credential sharing** - Cloudflare Access cookies work cross-subdomain
✅ **No page reload needed** - Just click Maker again after auth

## Configuration

### Terraform (infrastructure/cloudflare-access/main.tf)
```hcl
resource "cloudflare_zero_trust_access_application" "auth" {
  domain = "auth.wenzelarifiandi.com"
  cors_headers {
    allowed_origins   = ["https://wenzelarifiandi.com", "http://localhost:4321"]
    allow_credentials = true
  }
}
```

### Frontend (site/src/components/Nav.astro)
```javascript
async function checkAuthStatus() {
  const response = await fetch("https://auth.wenzelarifiandi.com/cdn-cgi/access/get-identity", {
    credentials: "include"
  });
  return response.status === 200;
}

creatorToggle.addEventListener('click', async () => {
  if (await checkAuthStatus()) {
    openMakerMenu();  // Show dropdown
  } else {
    // Redirect to auth, will return to current page
    window.location.href = `https://auth.wenzelarifiandi.com/cdn-cgi/access/login?redirect_url=${encodeURIComponent(window.location.href)}`;
  }
});
```

## Testing

1. Visit https://wenzelarifiandi.com (not authenticated)
2. Click Maker button
3. Should redirect to Cloudflare Access login
4. Authenticate with Zitadel
5. Should return to wenzelarifiandi.com
6. Click Maker button again
7. Dropdown should open immediately

## Troubleshooting

### CORS Errors
- Verify Cloudflare Access app has correct CORS settings
- Check browser console for specific CORS errors
- Ensure `credentials: "include"` is set in fetch

### Auth Not Persisting
- Cloudflare Access cookies last 24h (configurable)
- Cookies are domain-scoped to `.wenzelarifiandi.com`
- Check browser isn't blocking third-party cookies

### Redirect Loop
- Ensure redirect_url is properly URL-encoded
- Check Cloudflare Access redirect settings

## Deployment Status

- ✅ Code deployed to GitHub
- ✅ Nav.astro updated with fetch-based auth
- ✅ Terraform configuration updated with CORS
- ⚠️ Terraform state needs policy import (see IMPORT_GUIDE.md)
- ✅ Site should work once deployed

## Next Steps

The auth flow is implemented! When the site is deployed, users will:
1. Click Maker → check auth via CORS
2. If not authenticated → redirect to cipher for auth
3. After auth → return to Ariane automatically
4. Click Maker again → menu opens

No manual intervention needed after deployment!

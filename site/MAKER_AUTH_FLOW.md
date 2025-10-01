# Maker Button Authentication Flow

## Overview

The Maker button on wenzelarifiandi.com now requires authentication via Cloudflare Access + Cipher (Zitadel OIDC) before revealing the maker menu.

## Authentication Flow

### 1. Initial State (Not Authenticated)
- User visits https://wenzelarifiandi.com
- Clicks the "Maker" button
- System checks authentication status (sessionStorage)

### 2. Redirect to Authentication
If not authenticated:
```
wenzelarifiandi.com
  → https://cipher.wenzelarifiandi.com/cdn-cgi/access/login?redirect_url=...
  → Cloudflare Access login page
  → Zitadel OIDC authentication
  → Back to wenzelarifiandi.com?auth_success=true
```

### 3. Post-Authentication
- URL parameter `auth_success=true` indicates successful auth
- Authentication state stored in `sessionStorage` as `maker_authenticated=true`
- Auth success parameter removed from URL (clean URL)
- Maker menu automatically opens to show maker tools

### 4. Subsequent Visits
- Authentication state persists via sessionStorage
- Clicking Maker button directly shows the menu
- No re-authentication needed until session ends

## Technical Implementation

### Components Updated

#### 1. Nav.astro (`src/components/Nav.astro`)
- **checkAuthStatus()**: Checks sessionStorage and URL parameters
- **handleAuthReturn()**: Processes auth_success parameter
- **Maker button handler**: Redirects to Cloudflare Access if not authenticated

```javascript
// Check auth status
async function checkAuthStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth_success') === 'true') {
    isAuthenticated = true;
    sessionStorage.setItem('maker_authenticated', 'true');
  } else if (sessionStorage.getItem('maker_authenticated') === 'true') {
    isAuthenticated = true;
  }
  return isAuthenticated;
}

// Redirect to Cloudflare Access
window.location.href = `https://cipher.wenzelarifiandi.com/cdn-cgi/access/login?redirect_url=${returnUrl}`;
```

#### 2. Auth Return Handler (`src/pages/api/auth/return.ts`)
- Validates return_to URLs (only allows wenzelarifiandi.com or localhost)
- Adds `auth_success=true` parameter to redirect URL
- Handles both GET and POST callbacks

#### 3. Auth Check Endpoint (`src/pages/api/auth/check.ts`)
- Server-side endpoint for checking auth status
- Currently a placeholder for future enhancement

## Cloudflare Access Configuration

### Application Settings
- **Domain**: cipher.wenzelarifiandi.com
- **Type**: self_hosted
- **Session Duration**: 24h
- **Auto-redirect**: true (automatically redirects to Zitadel OIDC)

### CORS Settings
```terraform
cors_headers {
  allow_all_origins = false
  allowed_origins   = [
    "https://cipher.wenzelarifiandi.com",
    "https://wenzelarifiandi.com",
    "http://localhost:4321"
  ]
  allowed_methods   = ["GET", "POST", "OPTIONS"]
  allowed_headers   = ["Content-Type", "Authorization"]
  allow_credentials = true
  max_age           = 86400
}
```

### Identity Provider
- **Name**: Cipher OIDC
- **Type**: OIDC (Zitadel)
- **Issuer**: https://cipher.wenzelarifiandi.com

## Security Notes

### Session Management
- Authentication state stored in `sessionStorage` (cleared on browser close)
- For more persistent auth, consider using `localStorage` or server-side sessions
- Current implementation is client-side only

### Cookie Limitations
- Cloudflare Access cookies are `httpOnly` and `secure`
- Cannot be accessed via JavaScript cross-domain
- Using redirect-based flow instead of cookie checking

### Future Enhancements
1. **Server-side session validation**
   - Store session in database or Redis
   - Validate on server before showing maker content

2. **Token-based auth**
   - Extract JWT from Cloudflare Access
   - Validate token server-side
   - Issue your own session token

3. **Automatic re-authentication**
   - Detect expired sessions
   - Silent re-auth via iframe
   - Refresh tokens

## Testing the Flow

### Manual Testing
1. Clear sessionStorage: `sessionStorage.clear()`
2. Visit https://wenzelarifiandi.com
3. Click "Maker" button
4. Should redirect to Cloudflare Access login
5. Authenticate with Zitadel
6. Should return to wenzelarifiandi.com with menu open

### Debug Console Commands
```javascript
// Check auth status
sessionStorage.getItem('maker_authenticated')

// Clear auth
sessionStorage.removeItem('maker_authenticated')

// Manually set auth
sessionStorage.setItem('maker_authenticated', 'true')
```

### Expected Behavior
- ✅ Unauthenticated users redirected to Cloudflare Access
- ✅ After auth, returns to original page
- ✅ Maker menu opens automatically after successful auth
- ✅ Auth state persists during browser session
- ✅ Clean URL after auth (no auth_success parameter visible)

## Troubleshooting

### Issue: Redirect loop
**Cause**: auth_success parameter not being detected
**Fix**: Check URL parsing logic in handleAuthReturn()

### Issue: Menu doesn't open after auth
**Cause**: sessionStorage not being set
**Fix**: Check browser console for errors, verify auth_success parameter

### Issue: Auth doesn't persist
**Cause**: sessionStorage being cleared
**Fix**: Check if using incognito mode or if browser clears storage

### Issue: CORS errors
**Cause**: cipher domain not in allowed origins
**Fix**: Verify Cloudflare Access CORS configuration includes wenzelarifiandi.com

## Related Files
- `/site/src/components/Nav.astro` - Main navigation with Maker button
- `/site/src/pages/api/auth/return.ts` - Auth callback handler
- `/site/src/pages/api/auth/check.ts` - Auth status endpoint
- `/infrastructure/cloudflare-access/main.tf` - Cloudflare Access config

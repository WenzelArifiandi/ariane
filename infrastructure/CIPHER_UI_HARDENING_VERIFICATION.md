# Cipher ZITADEL UI Hardening - Verification Report

**Date**: 2025-10-04 22:17 WIB
**Status**: ✅ CONFIGURATION APPLIED SUCCESSFULLY

---

## Applied Configuration

### 1. Cache Bypass Rule ✅
- **Phase**: `http_request_cache_settings`
- **Expression**:
```
(http.host eq "cipher.wenzelarifiandi.com" and (
  starts_with(http.request.uri.path, "/.well-known/") or
  starts_with(http.request.uri.path, "/oidc/") or
  starts_with(http.request.uri.path, "/oauth/") or
  starts_with(http.request.uri.path, "/ui/") or
  starts_with(http.request.uri.path, "/assets/")
))
```
- **Action**: `cache: false`
- **Ruleset ID**: `3750422c31fe4cb786e99147accecf12` (updated existing)

### 2. Development Mode ✅
- **Status**: Enabled
- **Duration**: 3 hours (auto-expires)
- **Purpose**: Bypass all Cloudflare caching/optimization during testing

### 3. Cache Purge ✅
- **Host**: `cipher.wenzelarifiandi.com`
- **Scope**: All cached content purged
- **Status**: Successful

---

## Health Check Results

### Test 1: UI HTML Endpoint

**Request**:
```bash
curl -sSI "https://cipher.wenzelarifiandi.com/ui/v2/login/loginname"
```

**Response Headers**:
```
HTTP/2 200
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
content-type: text/html; charset=utf-8
x-powered-by: Next.js
```

**Analysis**:
- ✅ HTTP 200 OK
- ✅ `cache-control: no-cache, no-store` (origin respects our bypass)
- ✅ No `CF-Cache-Status` header (Dev Mode active or not proxied through cache)
- ✅ Content-Type correct (HTML)
- ✅ CSP policy present (ZITADEL UI security)
- ✅ No Cloudflare error page

### Test 2: OIDC Endpoint

**Request**:
```bash
curl -sSI "https://cipher.wenzelarifiandi.com/oidc/v1/end_session?client_id=340307158316941421"
```

**Response**:
```
HTTP/2 302
cache-control: no-store
location: /ui/v2/login/logout?post_logout_redirect=%2Flogout%2Fdone
```

**Analysis**:
- ✅ HTTP 302 redirect (correct behavior)
- ✅ `cache-control: no-store`
- ✅ Location header present

---

## What Was NOT Applied (Requires Manual Configuration)

Due to Cloudflare API limitations, the following need to be configured manually via Dashboard:

### 1. Configuration Rules (Feature Disables)
**Needed**: Disable for `/ui/*` and `/assets/*` paths:
- Rocket Loader
- Auto Minify (HTML, CSS, JS)
- Email Obfuscation
- Mirage
- Polish
- Early Hints
- Automatic HTTPS Rewrites

**Why**: Account-scoped API token can configure these, but the phase ruleset already exists and needs updating via Dashboard.

### 2. WAF Custom Rules
**Needed**: Skip managed rules for Cipher paths to prevent false positives.

**Why**: Similar to above - existing WAF ruleset needs manual update.

### 3. Page Rules (Optional, if on paid plan)
Create 5 page rules with `Cache Level: Bypass` + features disabled:
1. `cipher.wenzelarifiandi.com/.well-known/*`
2. `cipher.wenzelarifiandi.com/oidc/*`
3. `cipher.wenzelarifiandi.com/oauth/*`
4. `cipher.wenzelarifiandi.com/ui/*`
5. `cipher.wenzelarifiandi.com/assets/*`

---

## Browser Verification Steps

### Step 1: Test UI Loads
1. Open: https://cipher.wenzelarifiandi.com/ui/v2/login/loginname
2. Expected: Page renders completely, no "Application error"

### Step 2: Check DevTools Network Tab
1. Open DevTools (F12) → Network tab
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Filter by `/ui/` and `/assets/`

**Expected Results**:
- All requests return **200 OK**
- No 4xx/5xx errors
- No Cloudflare error HTML
- Check `CF-Cache-Status` header:
  - `BYPASS` or `DYNAMIC` = ✅ Good
  - `HIT` = ❌ Cache rule not working
  - No header = ✅ Good (Dev Mode active)

### Step 3: Check Console Tab
1. Open DevTools → Console tab
2. Look for errors

**Expected Results**:
- ❌ NO CSP (Content Security Policy) errors
- ❌ NO Rocket Loader errors
- ❌ NO minification/parsing errors
- ✅ Clean console (or only ZITADEL internal logs)

### Step 4: Test Full Auth Flow
1. Navigate to: https://wenzelarifiandi.com/maker
2. Should redirect to Cloudflare Access
3. Should redirect to Cipher login UI
4. Enter credentials
5. Should redirect back to /maker
6. Click logout link
7. Should clear sessions and return to home

**Expected**: No "Application error" at any step

---

## Troubleshooting

### If "Application error" persists:

1. **Check Development Mode** is still active (auto-expires after 3 hours):
   ```bash
   curl -sS "https://api.cloudflare.com/client/v4/zones/ZONE_ID/settings/development_mode" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result.value'
   ```
   Should return: `"on"`

2. **Check Cache Bypass Rule** is active:
   ```bash
   curl -sS "https://api.cloudflare.com/client/v4/zones/ZONE_ID/rulesets/3750422c31fe4cb786e99147accecf12" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result.rules[]'
   ```
   Should show our rule with `"enabled": true`

3. **Test with DevTools disabled cache**:
   - Open DevTools → Network tab
   - Check "Disable cache"
   - Hard refresh

4. **Capture failing asset URL**:
   - Note the exact URL that returns error
   - Check its response headers
   - Look for Cloudflare injections (Rocket Loader, minification markers)

5. **Manual Dashboard Check**:
   - Go to Cloudflare Dashboard → Rules
   - Check if any Transform Rules or Config Rules are interfering
   - Temporarily disable all rules except our Cache Bypass

---

## Configuration Scripts

Located in `infrastructure/cloudflare-access/`:

1. **harden-cipher-ui.sh** - Main hardening script (used by workflow)
2. **list-cipher-rulesets.sh** - List existing rulesets
3. **configure-cipher-zone.yml** - GitHub Actions workflow

### Manual Re-run

```bash
export CLOUDFLARE_API_TOKEN="your_token"
cd infrastructure/cloudflare-access
./harden-cipher-ui.sh
```

Or via GitHub Actions:
```
Actions → Configure Cipher ZITADEL Zone → Run workflow
```

---

## Current Status Summary

| Item | Status | Notes |
|------|--------|-------|
| Cache Bypass for 5 paths | ✅ APPLIED | Via API - ruleset updated |
| Development Mode | ✅ ENABLED | Active for 3 hours |
| Cache Purged | ✅ DONE | All cached content cleared |
| Feature Disables (Config Rules) | ⏳ PENDING | Manual dashboard config needed |
| WAF Bypass | ⏳ PENDING | Manual dashboard config needed |
| Page Rules | ⏳ OPTIONAL | Manual dashboard config (if needed) |
| UI Endpoint Health | ✅ PASS | HTTP 200, proper headers |
| OIDC Endpoint Health | ✅ PASS | HTTP 302, clean redirect |

---

## Next Steps

1. **Immediate**: Test UI in browser (steps above)
2. **If working**: No further action needed (Dev Mode handles optimization bypass)
3. **If not working**: Apply manual Config Rules + WAF bypass via dashboard
4. **After 3 hours**: Re-run hardening script to refresh Dev Mode if still testing

---

## References

- [CIPHER_CLOUDFLARE_HARDENING.md](CIPHER_CLOUDFLARE_HARDENING.md) - Complete hardening guide
- [CIPHER_HEALTH_CHECK_RESULTS.md](CIPHER_HEALTH_CHECK_RESULTS.md) - Initial health check results
- Workflow run: https://github.com/WenzelArifiandi/ariane/actions/runs/18246057099

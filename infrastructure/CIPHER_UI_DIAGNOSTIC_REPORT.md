# ZITADEL UI "Application error" Diagnostic Report

**Target**: cipher.wenzelarifiandi.com/ui/v2/login/loginname
**Issue**: "Application error" appears on ZITADEL v2 login UI
**Date**: 2025-10-04
**Status**: 🔍 In Progress

## Executive Summary

The "Application error" on ZITADEL UI is likely caused by **expired/consumed requestId** in the OAuth2 authorization flow, rather than Cloudflare interference. This document tracks diagnostic steps and findings.

## Diagnostic Checklist

### ✅ Step 1: Verify Headers Show No CF Interference

**Result**: CONFIRMED - No Cloudflare interference detected

```bash
# UI Endpoint
curl -I "https://cipher.wenzelarifiandi.com/ui/v2/login/loginname"
HTTP/2 200
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
content-type: text/html; charset=utf-8
# ✓ No CF-Cache-Status header (Dev Mode or cache bypass working)
# ✓ Proper cache-control from origin
# ✓ No Cloudflare modifications

# JS Assets
curl -I "https://cipher.wenzelarifiandi.com/ui/v2/login/_next/static/chunks/app/layout.js"
HTTP/2 200
cache-control: public, max-age=31536000, immutable
content-type: application/javascript; charset=UTF-8
# ✓ Clean headers, no CF interference
```

### ✅ Step 2: Validate OIDC Client Redirect URIs

**Expected Configuration**:
```
Client ID: 340307158316941421
Project ID: 340307138714804333
Redirect URI: https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback
Post Logout Redirect URI: https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=https%3A%2F%2Fwenzelarifiandi.com%2F
```

**Verification Tool**: `./scripts/verify-cipher-oidc-client.sh`

**Manual Verification**:
1. Go to: https://cipher.wenzelarifiandi.com
2. Login as admin
3. Navigate to: Projects → Ariane → Applications
4. Click on 'Cloudflare Access' application
5. Verify Redirect URIs match expected values

**Status**: Manual verification required (ZITADEL_ADMIN_TOKEN not available for automated check)

### 🔍 Step 3: Reproduce with Fresh requestId from /maker Flow

**Expected Flow**:
```
1. User visits: https://wenzelarifiandi.com/maker
   ↓
2. Redirects to: https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/login/...
   ↓
3. Cloudflare Access redirects to ZITADEL authorize:
   https://cipher.wenzelarifiandi.com/oauth/v2/authorize?
     client_id=340307158316941421
     &redirect_uri=https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback
     &response_type=code
     &scope=openid email profile
     &state=<random>
     &nonce=<random>
   ↓
4. ZITADEL creates requestId and redirects to:
   https://cipher.wenzelarifiandi.com/ui/v2/login/loginname?requestId=oidc_V2_...
   ↓
5. User sees ZITADEL login UI
```

**Test Plan**:
1. Open browser DevTools (Network tab)
2. Visit: https://wenzelarifiandi.com/maker
3. Capture full redirect chain
4. Observe if "Application error" appears on:
   - First load ❌ → Indicates JS/ZITADEL backend error
   - Only on refresh ✅ → Confirms expired requestId hypothesis

**Diagnostic Tool**: `./infrastructure/cloudflare-access/diagnose-cipher-oidc-flow.sh`

**Status**: Manual browser testing required

### ⏳ Step 4: Check for WAF False Positives on UI XHRs

**Test Plan**:
1. Open browser DevTools (Network tab)
2. Visit ZITADEL UI with valid requestId
3. Filter XHR requests to `/ui/*` paths
4. Look for:
   - HTTP 403 responses
   - `cf-mitigated: challenge` headers
   - Managed Challenge interstitials
   - Unusual response patterns

**Current WAF Configuration**:
```hcl
# WAF Bypass Rule (from infrastructure/terraform/cloudflare.tf)
Expression: (http.host eq "cipher.wenzelarifiandi.com" and (
  starts_with(http.request.uri.path, "/.well-known/") or
  starts_with(http.request.uri.path, "/oidc/v1/") or
  starts_with(http.request.uri.path, "/oauth/v2/")
))
Action: Skip WAF
```

**Note**: `/ui/*` and `/assets/*` paths are NOT currently in WAF bypass rule. This could cause issues if WAF challenges ZITADEL UI requests.

**Status**: Pending manual browser testing

### ⏳ Step 5: Implement Graceful Stale requestId Handling

**Hypothesis**: If "Application error" only appears on refresh, the requestId has expired/been consumed.

**Solution Options**:
1. **Client-side detection**: Catch error in /maker or Cloudflare Access callback, auto-restart OIDC flow
2. **ZITADEL UI improvement**: Display user-friendly error message with "Try again" button
3. **Cloudflare Access config**: Adjust session/token lifetimes

**Status**: Pending confirmation from Step 3

## Tools Created

1. **`./infrastructure/cloudflare-access/diagnose-cipher-oidc-flow.sh`**
   - Traces OAuth2 flow from /maker through to ZITADEL UI
   - Checks Cloudflare Development Mode status
   - Provides manual testing steps

2. **`./scripts/verify-cipher-oidc-client.sh`**
   - Verifies ZITADEL OIDC client configuration
   - Checks redirect URIs match expected values
   - Supports both API query (with token) and manual verification

## Applied Configuration (from Previous Session)

### Cache Rules ✅
```
Expression: (http.host eq "cipher.wenzelarifiandi.com" and (
  starts_with(http.request.uri.path, "/.well-known/") or
  starts_with(http.request.uri.path, "/oidc/") or
  starts_with(http.request.uri.path, "/oauth/") or
  starts_with(http.request.uri.path, "/ui/") or
  starts_with(http.request.uri.path, "/assets/")
))
Action: Cache OFF
Ruleset ID: 3750422c31fe4cb786e99147accecf12
```

### Development Mode ✅
- Status: Enabled
- Duration: 3 hours
- Bypasses: All Cloudflare optimizations

### Cache Purge ✅
- Host: cipher.wenzelarifiandi.com
- Status: Purged successfully

## Next Steps

1. **Manual Browser Testing** (Step 3):
   - Open https://wenzelarifiandi.com/maker in incognito
   - Capture Network tab showing full OAuth flow
   - Test if error occurs on first load vs refresh
   - Save HAR file of failing request

2. **WAF Investigation** (Step 4):
   - Monitor Network tab for 403s on `/ui/*` XHRs
   - Consider adding `/ui/*` to WAF bypass rule

3. **requestId Handling** (Step 5):
   - If Step 3 confirms expired requestId issue:
     - Add client-side guard in /maker
     - Implement auto-retry logic
     - Display user-friendly error

## References

- ZITADEL API Docs: https://zitadel.com/docs/apis/introduction
- Cloudflare Access Docs: https://developers.cloudflare.com/cloudflare-one/applications/
- OAuth2 RFC: https://www.rfc-editor.org/rfc/rfc6749

## Logs and Evidence

### Cloudflare Access Login Redirect
```
GET https://wenzelarifiandi.com/maker
→ 302 https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/login/wenzelarifiandi.com?kid=...&meta=...&redirect_url=%2Fmaker
```

### ZITADEL UI Endpoint (No requestId)
```
GET https://cipher.wenzelarifiandi.com/ui/v2/login/loginname
→ 200 OK (HTML page loads, but may show "Application error" without valid requestId)
```

---

**Last Updated**: 2025-10-04
**Next Review**: After manual browser testing in Step 3

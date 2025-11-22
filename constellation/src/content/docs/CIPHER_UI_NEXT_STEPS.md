---
title: "ZITADEL UI \"Application error\" - Next Steps"
slug: cipher_ui_next_steps
description: "# ZITADEL UI \"Application error\" - Next Steps"
---



# ZITADEL UI "Application error" - Next Steps

## Quick Summary

✅ **Cloudflare hardening complete**: Cache bypass, Development Mode, cache purge all applied
✅ **Headers verified**: No Cloudflare interference on UI or assets
📋 **OIDC config documented**: Manual verification steps provided
🔍 **Root cause hypothesis**: Expired/consumed requestId in OAuth2 flow (likely ZITADEL-side, not Cloudflare)

## Immediate Manual Testing Required

### Test 1: Reproduce with Fresh requestId

**Goal**: Determine if "Application error" occurs on first load or only on refresh

**Steps**:
1. Open Chrome/Firefox in **incognito mode**
2. Open DevTools → Network tab
3. Visit: https://wenzelarifiandi.com/maker
4. **Observe the redirect chain**:
   ```
   /maker
   → Cloudflare Access login
   → ZITADEL /oauth/v2/authorize
   → ZITADEL /ui/v2/login/loginname?requestId=oidc_V2_...
   ```
5. **First Test**: Does the ZITADEL UI load correctly on first view?
   - ✅ Loads correctly → Error only on refresh (confirms expired requestId)
   - ❌ Shows "Application error" → Different issue (JS error, ZITADEL backend)

6. **Second Test**: Without closing tab, manually reload the page
   - Does "Application error" appear now?

7. **Save Evidence**:
   - DevTools → Network tab → Right-click → "Save all as HAR"
   - Console tab → Screenshot any errors
   - Note the requestId from URL

**Expected Outcome**:
- If error only on refresh: requestId expired → Need graceful handling
- If error on first load: Check browser console for JS errors, check ZITADEL logs

### Test 2: Verify ZITADEL Client Configuration

**Goal**: Confirm redirect URIs match our code

**Steps**:
1. Go to: https://cipher.wenzelarifiandi.com
2. Login as admin
3. Navigate to: **Projects** → **Ariane** → **Applications**
4. Click on **Cloudflare Access** application (Client ID: `340307158316941421`)
5. Verify **Redirect URIs** section contains:
   ```
   https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback
   ```
6. Verify **Post Logout Redirect URIs** section contains:
   ```
   https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=https%3A%2F%2Fwenzelarifiandi.com%2F
   ```

**Alternative**: Run API query (requires admin token):
```bash
export ZITADEL_ADMIN_TOKEN="your-admin-pat-token"
./scripts/verify-cipher-oidc-client.sh
```

### Test 3: Check for WAF False Positives

**Goal**: Ensure Cloudflare WAF isn't blocking ZITADEL UI XHRs

**Steps**:
1. During Test 1, filter Network tab to **XHR** requests only
2. Look for any requests to `/ui/*` paths
3. Check for:
   - HTTP 403 responses
   - `cf-mitigated: challenge` in response headers
   - Unusual delays or redirects
4. If found: `/ui/*` may need to be added to WAF bypass rule

**Current WAF Bypass** (from [infrastructure/terraform/cloudflare.tf:114-130](infrastructure/terraform/cloudflare.tf#L114-L130)):
```hcl
expression = "(http.host eq \"cipher.wenzelarifiandi.com\" and (
  starts_with(http.request.uri.path, \"/.well-known/\") or
  starts_with(http.request.uri.path, \"/oidc/v1/\") or
  starts_with(http.request.uri.path, \"/oauth/v2/\")
))"
```

**Note**: `/ui/*` and `/assets/*` are NOT in WAF bypass (only in cache bypass)

## Automated Diagnostic Tools

### 1. OIDC Flow Diagnostic
```bash
cd infrastructure/cloudflare-access
./diagnose-cipher-oidc-flow.sh
```
**Output**: OAuth2 flow trace, Development Mode status, manual testing steps

### 2. OIDC Client Verification
```bash
./scripts/verify-cipher-oidc-client.sh
```
**Output**: Expected vs actual ZITADEL client configuration

### 3. Cloudflare Zone Hardening
```bash
cd infrastructure/cloudflare-access
./harden-cipher-ui.sh
```
**Output**: Cache bypass, Development Mode, cache purge (already applied)

## Possible Solutions (Based on Test Results)

### Scenario A: Error Only on Refresh (Expired requestId)

**Root Cause**: ZITADEL requestId is one-time use and short-lived. Page refresh tries to reuse consumed requestId.

**Solutions**:
1. **Client-side guard** in [site/src/pages/maker.ts](site/src/pages/maker.ts):
   ```typescript
   // Detect ZITADEL UI error and auto-restart OAuth flow
   if (url.searchParams.has("error")) {
     return Response.redirect("/maker", 302);
   }
   ```

2. **ZITADEL UI improvement**: Add user-friendly error with "Try again" button

3. **Document expected behavior**: Users should not refresh during OAuth flow

### Scenario B: Error on First Load (JS/Backend Issue)

**Root Cause**: JavaScript error or ZITADEL backend issue

**Diagnostic Steps**:
1. Check browser Console tab for JS errors
2. SSH to cipher: `./scripts/zitadel-remote-session.sh`
3. Check ZITADEL logs: `docker compose logs zitadel | grep ERROR`
4. Look for requestId-related errors

**Solutions**:
1. Fix JS error (if in custom UI code)
2. Check ZITADEL configuration for login UI settings
3. Verify ZITADEL database projections are healthy

### Scenario C: WAF Blocking UI XHRs

**Root Cause**: Cloudflare WAF challenges ZITADEL UI API requests

**Solution**: Add `/ui/*` to WAF bypass rule in [infrastructure/terraform/cloudflare.tf](infrastructure/terraform/cloudflare.tf#L114-L130):
```hcl
expression = "(http.host eq \"cipher.wenzelarifiandi.com\" and (
  starts_with(http.request.uri.path, \"/.well-known/\") or
  starts_with(http.request.uri.path, \"/oidc/v1/\") or
  starts_with(http.request.uri.path, \"/oauth/v2/\") or
  starts_with(http.request.uri.path, \"/ui/\")  # Add this
))"
```

Then apply:
```bash
cd infrastructure/terraform
terraform plan
terraform apply
```

## Current Status

### ✅ Completed
- Cloudflare cache bypass for `/ui/*` and `/assets/*`
- Development Mode enabled (3 hours)
- Cache purged for cipher.wenzelarifiandi.com
- Headers verified (no CF interference)
- Diagnostic tools created
- Documentation updated

### 🔍 In Progress
- Manual browser testing to reproduce error
- ZITADEL client config verification
- WAF false positive check

### ⏳ Pending
- Implement graceful requestId handling (if needed)
- Add `/ui/*` to WAF bypass (if needed)
- Test complete auth flow end-to-end

## Evidence to Collect

When testing, please capture:
1. **HAR file**: Full Network tab recording of OAuth flow
2. **Console logs**: Any JavaScript errors
3. **Screenshots**: "Application error" screen
4. **ZITADEL logs**: Server-side errors related to requestId
5. **requestId value**: From URL when error occurs

Share these with:
```bash
# Upload HAR to temporary storage
# Or attach to GitHub issue
```

## Related Documentation

- [CIPHER_UI_DIAGNOSTIC_REPORT.md](CIPHER_UI_DIAGNOSTIC_REPORT.md) - Full diagnostic findings
- [CIPHER_CLOUDFLARE_HARDENING.md](CIPHER_CLOUDFLARE_HARDENING.md) - Cloudflare configuration steps
- [CIPHER_UI_HARDENING_VERIFICATION.md](CIPHER_UI_HARDENING_VERIFICATION.md) - Applied configuration results
- [ZITADEL_OIDC_CONFIG.md](ZITADEL_OIDC_CONFIG.md) - Required ZITADEL client config

## Contact

For ZITADEL-specific issues:
- ZITADEL Docs: https://zitadel.com/docs
- ZITADEL Discord: https://discord.gg/zitadel

For Cloudflare Access issues:
- Cloudflare Docs: https://developers.cloudflare.com/cloudflare-one/
- Cloudflare Community: https://community.cloudflare.com/

---

**Created**: 2025-10-04
**Last Updated**: 2025-10-04
**Status**: Awaiting manual browser testing results

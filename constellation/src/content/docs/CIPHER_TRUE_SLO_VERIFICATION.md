---
title: "Cipher True Single Logout (SLO) - Verification Guide"
slug: cipher_true_slo_verification
description: "# Cipher True Single Logout (SLO) - Verification Guide"
---



# Cipher True Single Logout (SLO) - Verification Guide

**Date**: 2025-10-04
**Status**: Ready for Testing
**Goal**: Verify complete ZITADEL session termination on logout

## What Changed

### 1. Enhanced Session Termination ([site/src/lib/zitadel-service.ts](../site/src/lib/zitadel-service.ts))

**Before**: Only searched for OAuth sessions (incomplete logout)

**After**: Complete session termination strategy:
```typescript
// 1. Search for ACTIVE sessions (state filter)
listUserSessions(userId) // filters: userId + SESSION_STATE_ACTIVE

// 2. Delete each session individually
for (const session of sessions) {
  await deleteSession(session.sessionId);
}

// 3. Fallback: Bulk terminate if no sessions found
if (sessions.length === 0) {
  await bulkTerminateUserSessions(userId);
  // POST /v2/users/{userId}/sessions/_terminate
}
```

**New API Calls**:
- `POST /v2/sessions/search` - Filter by `userId` + `SESSION_STATE_ACTIVE`
- `DELETE /v2/sessions/{id}` - Delete each active session
- `POST /v2/users/{userId}/sessions/_terminate` - Bulk terminate fallback

### 2. Added `prompt=login` to Cloudflare Access ([infrastructure/cloudflare-access/main.tf:24](../infrastructure/cloudflare-access/main.tf#L24))

**Purpose**: Force ZITADEL to show login screen on every authentication, preventing silent re-login

```hcl
config {
  # ... other config
  authorization_params = "prompt=login" # Force re-authentication
}
```

**Effect**: Even if ZITADEL has residual cookies, it will show the login screen instead of silently issuing a new token

### 3. Enhanced Logging ([site/src/pages/api/zitadel/slo.ts](../site/src/pages/api/zitadel/slo.ts))

**New Response Fields**:
```json
{
  "success": true,
  "email": "user@example.com",
  "sessionsDeleted": 2,      // Number of sessions deleted
  "sessionsFailed": 0,        // Number of failed deletions
  "bulkTerminated": false,    // True if bulk terminate was used
  "message": "2 session(s) deleted, 0 failed"
}
```

## Verification Steps

### Pre-Verification: Check Current State

1. **Ensure you're logged in**:
   ```bash
   # Visit in browser
   open https://cipher.wenzelarifiandi.com/ui/v2/profile
   ```
   - Expected: Shows your profile (signed in)

2. **Check active sessions**:
   ```bash
   # Run diagnostic (if ZITADEL_ADMIN_TOKEN available)
   curl -H "Authorization: Bearer $ZITADEL_ADMIN_TOKEN" \
     https://cipher.wenzelarifiandi.com/v2/sessions/search \
     -d '{"queries":[{"userIdQuery":{"userId":"YOUR_USER_ID"}}]}'
   ```

### Step 1: Test Logout Flow

1. **Trigger logout**:
   ```bash
   # In browser
   open https://wenzelarifiandi.com/logout
   ```

2. **Monitor server logs** (in separate terminal):
   ```bash
   # Watch server logs for SLO activity
   # If deployed to Vercel:
   vercel logs --follow

   # If local dev:
   npm run dev
   ```

3. **Expected log output**:
   ```
   [Unified Logout] 🚪 Starting unified logout flow
   [Unified Logout] 📧 User identified: user@example.com
   [Unified Logout] 🔥 Triggered fire-and-forget SLO API call
   [Unified Logout] 🎯 Branch A: Valid ZITADEL token - using Cipher end_session
   [Unified Logout] 🔗 Redirect chain:
   [Unified Logout]   1️⃣ Cipher end_session (silent)
   [Unified Logout]   2️⃣ Cloudflare Access logout
   [Unified Logout]   3️⃣ Final destination: https://wenzelarifiandi.com/

   [SLO API] 🚪 Revoking ZITADEL sessions for user@example.com
   [ZITADEL SLO] 🚪 Starting true sign-out for user@example.com
   [ZITADEL SLO] ✅ Found user: { userId: '...', email: 'user@example.com' }
   [ZITADEL SLO] 📋 Found 2 ACTIVE session(s) for user ...
   [ZITADEL SLO] 🗑️ Deleting session oidc_V2_... (state: ACTIVE)
   [ZITADEL SLO] ✅ Successfully deleted session oidc_V2_...
   [ZITADEL SLO] 🗑️ Deleting session oidc_V2_... (state: ACTIVE)
   [ZITADEL SLO] ✅ Successfully deleted session oidc_V2_...
   [ZITADEL SLO] 🎯 Session revocation complete: 2 deleted, 0 failed
   [ZITADEL SLO] ✅ True sign-out complete - all browser sessions terminated
   [SLO API] ✅ SLO complete: 2 session(s) deleted, 0 failed
   ```

4. **Verify critical log lines**:
   - ✅ `browser sessions deleted: >=1` (or `bulkTerminated: true`)
   - ✅ `True sign-out complete`
   - ❌ NO `sessionsFailed` > 0

### Step 2: Verify Sign-Out at ZITADEL

1. **Check ZITADEL profile** (should be signed out):
   ```bash
   open https://cipher.wenzelarifiandi.com/ui/v2/profile
   ```
   - Expected: Redirects to login page (NOT showing profile)
   - If shows profile → SLO failed, sessions still active

2. **Check Cloudflare Access** (should require re-login):
   ```bash
   open https://wenzelarifiandi.com/maker
   ```
   - Expected: Shows Cloudflare Access login picker
   - Choose "Cipher OIDC"
   - Expected: Shows ZITADEL login screen (NOT silent redirect)
   - If silent redirect → `prompt=login` not working

### Step 3: Verify prompt=login is Applied

**Test**: After logout, try to access protected resource again

```bash
# Clear browser cookies for clean test
# Then visit:
open https://wenzelarifiandi.com/maker
```

**Expected Flow**:
1. Cloudflare Access login picker → Choose "Cipher OIDC"
2. Redirect to: `https://cipher.wenzelarifiandi.com/oauth/v2/authorize?...prompt=login...`
3. ZITADEL login screen appears (username/password form)
4. **NOT** immediate redirect back to Cloudflare Access

**Check URL** in browser address bar during auth:
```
https://cipher.wenzelarifiandi.com/oauth/v2/authorize?
  client_id=340307158316941421
  &redirect_uri=https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback
  &response_type=code
  &scope=openid%20profile%20email
  &prompt=login  ← THIS MUST BE PRESENT
```

**Verification**:
- ✅ URL contains `prompt=login`
- ✅ Login screen shows (not auto-login)
- ❌ If missing `prompt=login` → Terraform apply needed

### Step 4: Complete E2E Test

**Full cycle test**:
1. Login → Visit /maker → Authenticated ✅
2. Check profile → Signed in at ZITADEL ✅
3. Logout → Redirect chain completes ✅
4. Check logs → Sessions deleted >=1 ✅
5. Check profile → Signed out at ZITADEL ✅
6. Re-login → Shows login screen (not silent) ✅

## Expected Results

### Success Indicators

| Check | Expected | Reason |
|-------|----------|--------|
| SLO log shows `sessionsDeleted >= 1` | ✅ | Browser sessions terminated |
| SLO log shows `bulkTerminated: true` (if 0 sessions) | ✅ | Fallback worked |
| After logout: `/ui/v2/profile` redirects to login | ✅ | No active session at ZITADEL |
| After logout: `/maker` shows login screen | ✅ | No silent re-authentication |
| Authorize URL contains `prompt=login` | ✅ | Cloudflare Access configured |
| No `sessionsFailed` in logs | ✅ | All sessions deleted successfully |

### Failure Indicators

| Symptom | Problem | Fix |
|---------|---------|-----|
| SLO log: `sessionsDeleted: 0, bulkTerminated: false` | No sessions found or deleted | Check service account permissions |
| `/ui/v2/profile` still shows profile | Sessions not terminated | Check DELETE API calls in logs |
| Silent re-login (no username/password prompt) | `prompt=login` not applied | Run `terraform apply` |
| Authorize URL missing `prompt=login` | Terraform not applied | Check deployment |
| `sessionsFailed > 0` | Permission denied | Check ZITADEL service account role |

## Troubleshooting

### Issue 1: No Sessions Found

**Symptom**:
```
[ZITADEL SLO] 📋 Found 0 ACTIVE session(s) for user ...
[ZITADEL SLO] 🔄 No individual sessions found - using bulk terminate
```

**Possible Causes**:
1. User already logged out
2. Session state filter incorrect
3. Service account missing permissions

**Fix**:
```bash
# Check if bulk terminate worked
# Look for: "Bulk terminate successful"

# If bulk terminate also failed, check service account permissions:
# ZITADEL Console → Service Users → Cipher OIDC Client
# Required: session.delete permission
```

### Issue 2: Silent Re-Login (No prompt=login)

**Symptom**: After logout, visiting /maker immediately logs you back in without showing login screen

**Diagnosis**:
```bash
# Check if Terraform was applied
cd infrastructure/cloudflare-access
terraform show | grep authorization_params
# Should output: authorization_params = "prompt=login"
```

**Fix**:
```bash
# Apply Terraform configuration
cd infrastructure/cloudflare-access
terraform plan
terraform apply

# Or trigger GitHub Actions workflow
gh workflow run cloudflare-access.yml --field action=apply
```

### Issue 3: Sessions Failed to Delete

**Symptom**:
```
[ZITADEL SLO] ❌ Failed to delete session oidc_V2_...
[ZITADEL SLO] ⚠️ Some sessions failed to delete (1/2)
```

**Possible Causes**:
1. Service account missing `session.delete` permission
2. Session already terminated by another process
3. ZITADEL API error

**Fix**:
```bash
# 1. Check service account permissions
# ZITADEL Console → Settings → Service Users → Cipher OIDC Client
# Grant: Organization Owner OR custom role with session.delete

# 2. Check ZITADEL logs on server
ssh ubuntu@cipher.griffin-justitia.ts.net
docker compose logs zitadel | grep -i "session.*delete"

# 3. Test DELETE API directly
curl -X DELETE \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  https://cipher.wenzelarifiandi.com/v2/sessions/SESSION_ID_HERE
```

### Issue 4: SLO API Not Called

**Symptom**: No SLO logs appear after logout

**Possible Causes**:
1. No valid ZITADEL ID token (skipped Cipher end_session)
2. SLO API fetch failed silently
3. Fire-and-forget request dropped

**Diagnosis**:
```bash
# Check logout flow logs
# Should see:
[Unified Logout] 🎯 Branch A: Valid ZITADEL token - using Cipher end_session
[Unified Logout] 🔥 Triggered fire-and-forget SLO API call
```

**Fix**:
```bash
# If no SLO call triggered:
# 1. Check if ID token cookie exists
# In browser DevTools → Application → Cookies → wenzelarifiandi.com
# Look for: cipher_id_token

# 2. Check /maker endpoint stored token correctly
# Visit /maker, then check logs for:
[/maker] ✅ Stored valid ZITADEL ID token for silent logout
```

## API Reference

### Session Search Query

```json
POST /v2/sessions/search
{
  "queries": [
    {
      "userIdQuery": {
        "userId": "USER_ID_HERE"
      }
    },
    {
      "stateQuery": {
        "state": "SESSION_STATE_ACTIVE"
      }
    }
  ]
}
```

### Delete Session

```
DELETE /v2/sessions/{sessionId}
Authorization: Bearer SERVICE_ACCOUNT_TOKEN
```

### Bulk Terminate

```json
POST /v2/users/{userId}/sessions/_terminate
Authorization: Bearer SERVICE_ACCOUNT_TOKEN
{}
```

## Success Checklist

- [ ] Terraform applied with `authorization_params = "prompt=login"`
- [ ] Logout triggers SLO API call (logs show fire-and-forget)
- [ ] SLO logs show `sessionsDeleted >= 1` OR `bulkTerminated: true`
- [ ] No `sessionsFailed` errors in logs
- [ ] After logout: `/ui/v2/profile` redirects to login (signed out)
- [ ] After logout: `/maker` shows ZITADEL login screen (not silent)
- [ ] Authorize URL contains `prompt=login` parameter
- [ ] E2E test completes successfully

---

**Related Files**:
- [site/src/lib/zitadel-service.ts](../site/src/lib/zitadel-service.ts) - Session management
- [site/src/pages/api/zitadel/slo.ts](../site/src/pages/api/zitadel/slo.ts) - SLO API endpoint
- [site/src/pages/logout.ts](../site/src/pages/logout.ts) - Unified logout flow
- [infrastructure/cloudflare-access/main.tf](../infrastructure/cloudflare-access/main.tf) - Cloudflare Access config

**Last Updated**: 2025-10-04

# Hybrid SLO (Single Logout) Setup Guide

Complete logout solution that clears both Cloudflare Access AND ZITADEL sessions with zero user interaction.

## How It Works

1. **User clicks Logout** → `/signout` endpoint
2. **Extract user from CF_Authorization JWT** → Store in short-lived cookie (60s)
3. **Redirect to Cloudflare Access logout** → Clears Access session
4. **Return to homepage with `?slo=1`** → Triggers client-side script
5. **Client calls `/api/zitadel/slo`** → Reads SLO cookie, revokes ZITADEL sessions
6. **Both sessions cleared!** → Full logout complete

## Requirements

### 1. ZITADEL Service Account

Create a service user in ZITADEL with permissions to manage sessions:

```bash
# In ZITADEL Console:
1. Go to Users → Service Users
2. Click "New"
3. Name: "SLO Service Account"
4. Create user

5. Go to Service User details → Keys
6. Generate new key (Client ID + Secret or Private Key JWT)
7. Save credentials securely
```

### 2. Grant Permissions

The service account needs:
- **User Management**: To search users by email
- **Session Management**: To list and delete sessions

```bash
# In ZITADEL Console:
1. Go to Organization → Managers
2. Add service user with "Org Owner" role
   (or create custom role with user.read + session.delete)
```

### 3. Environment Variables

Add to Vercel (or your deployment platform):

```bash
ZITADEL_SERVICE_CLIENT_ID=<client-id-from-step-1>
ZITADEL_SERVICE_CLIENT_SECRET=<client-secret-from-step-1>
```

For local development, add to `.env`:

```bash
ZITADEL_SERVICE_CLIENT_ID=your-client-id
ZITADEL_SERVICE_CLIENT_SECRET=your-client-secret
```

## Architecture

### Files Created

1. **`/src/lib/cloudflare-access.ts`**
   - Verify CF_Authorization JWT
   - Extract user email/sub
   - Create/read/clear SLO cookie

2. **`/src/lib/zitadel-service.ts`**
   - Service account authentication (client credentials)
   - User search by email
   - Session listing and deletion
   - Main `revokeAllUserSessions()` function

3. **`/src/pages/api/zitadel/slo.ts`**
   - POST endpoint for session revocation
   - Reads SLO cookie
   - Calls ZITADEL API
   - Clears cookie

4. **`/src/pages/signout.ts`** (updated)
   - Verifies CF_Authorization JWT
   - Stores user email in SLO cookie
   - Adds `?slo=1` to return URL

5. **`/src/layouts/Base.astro`** (updated)
   - Client-side SLO trigger script
   - Detects `?slo=1` or `__cf_access_message=logged_out`
   - Calls `/api/zitadel/slo`

## Flow Diagram

```
┌─────────────┐
│ User clicks │
│   Logout    │
└──────┬──────┘
       │
       v
┌─────────────────────────────┐
│ /signout                     │
│ 1. Read CF_Authorization JWT │
│ 2. Extract user email        │
│ 3. Store in slo_user cookie  │
│ 4. Redirect to CF logout     │
└──────┬──────────────────────┘
       │
       v
┌────────────────────────────────┐
│ Cloudflare Access              │
│ 1. Clear Access session        │
│ 2. Redirect to /?slo=1         │
└──────┬─────────────────────────┘
       │
       v
┌────────────────────────────────┐
│ Homepage (/?slo=1)             │
│ 1. Detect SLO param            │
│ 2. Call /api/zitadel/slo       │
│ 3. Clean URL (remove ?slo=1)   │
└──────┬─────────────────────────┘
       │
       v
┌────────────────────────────────┐
│ /api/zitadel/slo               │
│ 1. Read slo_user cookie        │
│ 2. Get service account token   │
│ 3. Search user by email        │
│ 4. List user sessions          │
│ 5. Delete each session         │
│ 6. Clear slo_user cookie       │
└──────┬─────────────────────────┘
       │
       v
┌────────────────┐
│ Fully logged   │
│ out! 🎉        │
└────────────────┘
```

## Testing

### 1. Enable Logging

Check browser console and server logs for SLO messages:

```javascript
// Browser console:
[SLO] ZITADEL sessions revoked: 1

// Server logs:
[/signout] Stored SLO cookie for user hello@example.com
[SLO API] Revoking ZITADEL sessions for hello@example.com
[ZITADEL SLO] Found user { userId: '12345', email: 'hello@example.com' }
[ZITADEL SLO] Found 1 session(s) for user
[ZITADEL SLO] Deleted session abc123
[ZITADEL SLO] Complete: 1 deleted, 0 failed
```

### 2. Test Flow

1. **Login**: Click Maker → Authenticate via Cipher
2. **Verify**: Access granted, maker menu shows
3. **Logout**: Click Logout from maker menu
4. **Check logs**: Should see SLO messages
5. **Re-login**: Click Maker again → Should require FULL auth (no SSO!)

### 3. Verify Sessions Cleared

In ZITADEL Console:
1. Go to Users → find your user
2. Click Sessions tab
3. After logout, sessions should be empty

## Troubleshooting

### "No SLO cookie found"

**Cause**: CF_Authorization JWT not verified or user email not extracted

**Fix**:
- Check `/signout` logs for "Stored SLO cookie"
- Verify Cloudflare Access is sending CF_Authorization cookie
- Check cookie is HttpOnly, Secure, SameSite=Lax

### "ZITADEL service account credentials not configured"

**Cause**: Environment variables not set

**Fix**:
```bash
# Vercel
vercel env add ZITADEL_SERVICE_CLIENT_ID
vercel env add ZITADEL_SERVICE_CLIENT_SECRET

# Local
echo "ZITADEL_SERVICE_CLIENT_ID=..." >> .env
echo "ZITADEL_SERVICE_CLIENT_SECRET=..." >> .env
```

### "User search failed" or "Session search failed"

**Cause**: Service account lacks permissions

**Fix**:
1. Go to ZITADEL Console → Organization → Managers
2. Ensure service user has "Org Owner" role
3. Or create custom role with `user.read` + `session.delete` grants

### "Failed to get ZITADEL service token"

**Cause**: Invalid credentials or wrong API endpoint

**Fix**:
- Verify client_id and client_secret are correct
- Check ZITADEL_ISSUER in `zitadel-service.ts` matches your domain
- Test credentials manually:
  ```bash
  curl -X POST https://cipher.wenzelarifiandi.com/oauth/v2/token \
    -H "Authorization: Basic $(echo -n 'client_id:client_secret' | base64)" \
    -d "grant_type=client_credentials" \
    -d "scope=openid profile email urn:zitadel:iam:org:project:id:zitadel:aud"
  ```

## Security Notes

### SLO Cookie (60s TTL)

- **HttpOnly**: Cannot be accessed via JavaScript
- **Secure**: Only sent over HTTPS
- **SameSite=Lax**: CSRF protection
- **Short-lived**: 60 second expiry
- **Signed**: In production, sign with SESSION_SECRET (TODO)

### Service Account Token Caching

- Tokens cached with 60s expiry buffer
- Automatically refreshes on expiry
- Stored in memory (not persisted)

### Minimal Permissions

Service account should have ONLY:
- `user.read` (search users)
- `session.delete` (revoke sessions)

Do NOT grant full admin permissions.

## Benefits Over Standard OIDC Logout

✅ **No user interaction** - Fully automatic
✅ **No ZITADEL UI bugs** - Bypasses buggy end_session flow
✅ **Works without id_token_hint** - Uses email instead
✅ **Single click** - User just clicks Logout once
✅ **Complete cleanup** - Both Access and ZITADEL sessions cleared

## API Reference

### POST /api/zitadel/slo

Revoke ZITADEL sessions for logged-out user.

**Request**: `POST /api/zitadel/slo`
**Auth**: Requires `slo_user` cookie (set by `/signout`)
**Response**:
```json
{
  "success": true,
  "email": "hello@example.com",
  "sessionsDeleted": 1,
  "sessionsFailed": 0
}
```

### ZITADEL APIs Used

1. **POST /v2/users/_search** - Find user by email
2. **POST /v2/sessions/_search** - List user sessions
3. **DELETE /v2/sessions/:sessionId** - Delete session
4. **POST /oauth/v2/token** - Get service account token

## Future Enhancements

- [ ] Sign SLO cookie with SESSION_SECRET for added security
- [ ] Add rate limiting to `/api/zitadel/slo`
- [ ] Support private key JWT for service account (instead of client secret)
- [ ] Implement back-channel logout when ZITADEL supports it
- [ ] Add metrics/monitoring for SLO success rate

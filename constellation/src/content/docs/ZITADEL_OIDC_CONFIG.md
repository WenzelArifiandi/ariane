---
title: ZITADEL OIDC Configuration for Cloudflare Access
slug: zitadel_oidc_config
description: "# ZITADEL OIDC Configuration for Cloudflare Access"
---



# ZITADEL OIDC Configuration for Cloudflare Access

This document describes the required ZITADEL OIDC application configuration for the unified logout flow.

## Application Settings

**Application Name:** Cipher OIDC (for Cloudflare Access)

### URLs

- **Auth URL:** `https://cipher.wenzelarifiandi.com/oauth/v2/authorize`
- **Token URL:** `https://cipher.wenzelarifiandi.com/oauth/v2/token`
- **Userinfo URL:** `https://cipher.wenzelarifiandi.com/oidc/v1/userinfo`
- **JWKS URL:** `https://cipher.wenzelarifiandi.com/oauth/v2/keys`

### Redirect URIs

Must include:
- `https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/callback`

### Post Logout Redirect URIs

**CRITICAL:** Must include the exact Cloudflare Access logout URL:
```
https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=https%3A%2F%2Fwenzelarifiandi.com%2F
```

This allows the unified logout flow to redirect from ZITADEL → Cloudflare Access → Homepage.

### Scopes

- `openid` (required)
- `email` (required)
- `profile` (required)

### Client Credentials

- **Client ID:** `340307158316941421` (stored in `PUBLIC_OIDC_CLIENT_ID`)
- **Client Secret:** Stored in `CIPHER_CLIENT_SECRET` (Vercel environment variable)

## Unified Logout Flow

1. User clicks "Logout" in Maker menu → `/logout`
2. `/logout` endpoint fires off SLO API call (fire-and-forget)
3. Browser redirects to ZITADEL end_session:
   ```
   https://cipher.wenzelarifiandi.com/oidc/v1/end_session?client_id=<CLIENT_ID>&post_logout_redirect_uri=<ENCODED_CF_LOGOUT_URL>
   ```
4. ZITADEL clears session cookie and redirects to Cloudflare Access logout
5. Cloudflare Access clears session cookie and redirects to homepage
6. User is fully logged out of both systems

## Service-User Permissions

The service-user (used by `/api/zitadel/slo`) requires:
- Organization Owner role OR
- Custom role with:
  - `user.read` - to search users by email
  - `session.delete` - to revoke user sessions

Credentials: `CIPHER_CLIENT_ID` and `CIPHER_CLIENT_SECRET` in Vercel environment variables.

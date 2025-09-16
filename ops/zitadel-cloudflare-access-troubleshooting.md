# Zitadel + Cloudflare Access: Fix “code 5 Not Found”

The error “code 5 Not Found” during sign-in usually means the OIDC app configuration in Zitadel does not match what Cloudflare Access expects. This is almost always a misconfigured Redirect URI or an incorrect Client ID.

## What Cloudflare Access needs from Zitadel

- Client type: OIDC application (Confidential)
- Grant: Authorization Code
- Redirect URL: Use the exact value Cloudflare shows when creating the Zitadel Login Method, commonly one of:
  - `https://<your-team>.cloudflareaccess.com/cdn-cgi/access/callback` (Team Domain)
  - or if you use a custom team domain: `https://<your-custom-domain>/cdn-cgi/access/callback`
- Scopes: `openid`, `profile`, `email`

Tip: In Cloudflare Zero Trust → Settings → Authentication → Login methods → Zitadel, the UI will display the Redirect URL to paste into Zitadel. Copy it exactly (no trailing slash).

## What to enter in Cloudflare

- Discovery URL: `https://auth.wenzelarifiandi.com/.well-known/openid-configuration`
- Client ID: from your Zitadel app
- Client Secret: from your Zitadel app

## Common causes of “code 5 Not Found”

1) Redirect URL mismatch
- Zitadel app’s Redirect URIs must include Cloudflare’s redirect exactly as shown. If your Cloudflare team domain is custom, use that exact hostname.

2) Wrong Client ID
- If the Client ID entered in Cloudflare doesn’t exist in Zitadel (or is in another project), Zitadel will respond with code 5.

3) Authorization endpoint path typos
- Always use the Discovery URL; Cloudflare derives `authorization_endpoint` from it.

## How to verify quickly

1) Check Discovery
```bash
curl -s https://auth.wenzelarifiandi.com/.well-known/openid-configuration | jq '{issuer, authorization_endpoint, end_session_endpoint}'
```
Expect `authorization_endpoint` and `end_session_endpoint` URLs under `auth.wenzelarifiandi.com`.

2) Verify your expected Redirect URL candidates
- If your site is behind a custom Access team domain (same as your main domain), try:
  - `https://wenzelarifiandi.com/cdn-cgi/access/callback`
- If using a Cloudflare team subdomain, try:
  - `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`

3) Build a test authorization URL (replace CLIENT_ID and choose the right redirect)
```bash
AUTHZ="https://auth.wenzelarifiandi.com/oauth/v2/authorize"
REDIRECT="https://wenzelarifiandi.com/cdn-cgi/access/callback"  # or your <team>.cloudflareaccess.com one
CLIENT_ID="<paste-from-zitadel>"
open "${AUTHZ}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT}&scope=openid%20profile%20email&state=diag_state&nonce=diag_nonce"
```
- If you see “code 5 Not Found,” the client_id isn’t found or redirect doesn’t match the app.

## App-side checks (optional)

- Logout UX is wired for Zitadel end-session. Set:
  - `PUBLIC_OIDC_END_SESSION_ENDPOINT=https://auth.wenzelarifiandi.com/oidc/v1/end_session`
  - `PUBLIC_OIDC_CLIENT_ID=<your-client-id>` (optional)
- Visit `/api/oidc/diag` on your site to see discovery and sample logout link. Set `CF_TEAM_DOMAIN` env to show Cloudflare callback candidates.

## When it works
- Cloudflare presents the Zitadel consent/login page.
- After authentication, you’re redirected to `.../cdn-cgi/access/callback`, then back to your site.

If issues persist, confirm the Zitadel project/instance where the app lives matches the one in which you created the client ID, and re-copy Client Secret into Cloudflare.

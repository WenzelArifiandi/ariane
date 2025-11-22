---
title: Initialize a ZITADEL User (Fix not initialized errors)
slug: "zitadel-user-initialization"
description: "# Initialize a ZITADEL User (Fix not initialized errors)"
---



# Initialize a ZITADEL User (Fix not initialized errors)

Short version: flipping DB flags won’t fix this. ZITADEL is event-sourced—states are derived from events (projections). You must create the correct events by using Console or APIs.

What works (choose one):

1. Console (fastest)

- Users → select the user → choose one:
  - Send invitation email, or
  - Set an initial password
- These actions emit the proper initialization events.

Notes

- Don’t use "resend email verification" for uninitialized users; use invitation/initialization instead.

2. API (no SMTP required)

- Create an invite/init code and deliver it yourself, or set an initial password. Below are v2 endpoints with sample `curl`.

Prereqs

- A Management token with rights in the user’s organization. You can use a Personal Access Token (PAT) from the Console, or client credentials.
- Base URL: replace `AUTH_DOMAIN` with your domain, e.g. `auth.wenzelarifiandi.com`.

Get discovery (optional sanity):

```bash
curl -s https://AUTH_DOMAIN/.well-known/openid-configuration | jq '{issuer, token_endpoint}'
```

Example: Create an invite/init code (v2)

```bash
# Inputs
Z_DOMAIN="auth.wenzelarifiandi.com"
USER_ID="<zitadel-user-id>"         # e.g. from search users endpoint or Console URL
TOKEN="$(cat ~/.config/zitadel/pat.txt)"  # or any Bearer token with mgmt rights

curl -fsSL -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "https://${Z_DOMAIN}/api/v2/users/${USER_ID}/invite_code" |
  jq '.'

# Response contains a code you can embed in the init link shown by Console, or share directly.
```

Example: Set an initial password (v2)

```bash
Z_DOMAIN="auth.wenzelarifiandi.com"
USER_ID="<zitadel-user-id>"
TOKEN="$(cat ~/.config/zitadel/pat.txt)"
NEW_PASS="'<strong-pass-here>'"

curl -fsSL -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"password\": ${NEW_PASS}}" \
  "https://${Z_DOMAIN}/api/v2/users/${USER_ID}" |
  jq '.'

# v2 replaces legacy SetPassword; setting password initializes the user.
```

Fallbacks

- If v2 endpoints respond with 404/405 on your version, use the older endpoints:
  - Create init code (v1): `POST /management/v1/users/{userId}/init` (body may include `send_code: false` to avoid email)
  - Set password (v1): `POST /management/v1/users/{userId}/password` (deprecated but may still exist)

3. First admin totally blocked

- Re-run init to seed FirstInstance with an initial org and admin via steps file, e.g. using `zitadel start --steps <file>` (or `start-from-init` for your image version) so events are created correctly.

Why DB tweaks don’t stick

- ZITADEL writes immutable events and derives read models into projections. Direct DB changes only touch projections; commands evaluate the event stream and still see "not initialized".

Troubleshooting

- Ensure the token has org-owner or appropriate user management rights.
- If invite resend fails, create a new invite code first.
- Verify logs: `ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose logs --tail=200 zitadel'`.

Related

- `zitadel/README.md` for deployment and health.

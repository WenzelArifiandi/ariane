---
title: "Auth0 Approval Flow (Studio + Site)"
description: "# Auth0 Approval Flow (Studio + Site)"
slug: "readme-auth0"
---

# Auth0 Approval Flow (Studio + Site)

This adds a simple bridge so approving a request in Sanity also marks the user as approved in Auth0 (via app_metadata).

## What this does

- Studio action `Approve` (for documents of type `accessRequest`) now:
  1. Ensures an `approvedUser` document exists in Sanity
  2. Sets the `accessRequest.status = approved`
  3. Calls a Studio serverless API `POST /api/approve-user { email }`
- The API uses Auth0 Management API to set `app_metadata.approved = true` for that user.
- If a user doesn’t exist in Auth0 yet, the API returns 202 and does nothing (they’ll be updated the next time action is triggered after first login).

## Configure Auth0 (one-time)

1. Create a Machine-to-Machine application in Auth0

- Name: `Ariane Studio (M2M)`
- Allowed Audience: `https://YOUR_DOMAIN/api/v2/`
- Permissions (Auth0 Management API):
  - `read:users`, `update:users`, `read:users_app_metadata`, `update:users_app_metadata`

2. Get credentials

- Domain: e.g., `your-tenant.eu.auth0.com`
- Client ID and Client Secret from the M2M app

3. Set env vars in Vercel (Studio project settings)

- `AUTH0_DOMAIN = your-tenant.eu.auth0.com`
- `AUTH0_CLIENT_ID = <client id>`
- `AUTH0_CLIENT_SECRET = <client secret>`
- Redeploy Studio to apply.

## Use it

- In Studio, open an `accessRequest` document and click `Approve`.
- The request is approved in Sanity, and we best-effort update Auth0.
- You can see the `approved` flag under the user’s `app_metadata` in Auth0.

## How Site uses this

- Site already checks approved status via Sanity in:
  - `site/src/lib/sanityServer.ts` → `isApproved(email)`
- You can also enforce at Auth0 by adding a Rule/Action to block sign-in when `app_metadata.approved !== true` (optional if Cloudflare Access is the outer gate).

## Cloudflare Access + Auth0

- If Cloudflare Access fronts your dev/prod, set it to use Auth0 as the IdP.
- Group/role mapping from Auth0 → Access JWT can be custom (namespace claims). If you want path-based gates in the app:
  - Set env in Site: `CF_ACCESS_PROTECTED_PREFIXES`, `CF_ACCESS_REQUIRED_GROUPS` and optionally `CF_ACCESS_GROUPS_CLAIM`
  - Middleware (`site/src/middleware.ts`) will verify and allow/deny accordingly when `AUTH_MODE=cf-access-only`.

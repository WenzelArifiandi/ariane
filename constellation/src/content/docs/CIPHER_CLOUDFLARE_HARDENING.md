---
title: Cipher OIDC Endpoint Hardening
slug: cipher_cloudflare_hardening
description: "# Cipher OIDC Endpoint Hardening"
---



# Cipher OIDC Endpoint Hardening

## Summary

Cloudflare zone configuration for cipher.wenzelarifiandi.com to ensure ZITADEL OIDC endpoints and UI work reliably without "Application error" or asset loading issues.

## Required Configuration

### 1. Cache Rules
Bypass cache for OIDC/OAuth endpoints AND UI assets to prevent stale responses:
- `/.well-known/*` - OIDC discovery
- `/oidc/v1/*` - OIDC protocol endpoints
- `/oauth/v2/*` - OAuth endpoints
- `/ui/*` - **UI pages** (login, consent, etc.)
- `/ui/v2/*` - **V2 UI pages**
- `/assets/*` - **Static assets** (JS, CSS, images)

### 2. Page Rules
Disable features that interfere with ZITADEL on ALL paths above:
- **Rocket Loader**: OFF (breaks JS execution)
- **Auto Minify**: OFF (HTML, CSS, JS - breaks source maps)
- **Email Obfuscation**: OFF (breaks forms)
- **Mirage**: OFF (image optimization interferes)
- **Polish**: OFF (image optimization)
- **Zaraz/Transform Rules**: OFF (inject scripts)
- **Early Hints**: OFF (timing issues)
- **Automatic HTTPS Rewrites**: OFF (can break callbacks)
- **Respect Origin Cache-Control**: ON (let ZITADEL control caching)

### 3. WAF / Security Rules
Skip/bypass managed rules and firewall for all ZITADEL paths to prevent false positives blocking legitimate requests.

### 4. Zero Trust Access
**CRITICAL**: Ensure NO Access application/policy covers `cipher.wenzelarifiandi.com/*`

If an Access app exists for cipher:
- Add path exclusions for: `/.well-known/*`, `/oidc/v1/*`, `/oauth/v2/*`, `/ui/*`, `/ui/v2/*`, `/assets/*`
- OR remove the Access app entirely (cipher should be publicly accessible for OIDC)

## Health Check

Current status (2025-10-03):
```bash
curl -sS -D- "https://cipher.wenzelarifiandi.com/oidc/v1/end_session?client_id=340307158316941421&post_logout_redirect_uri=https%3A%2F%2Fwenzelarifiandi.cloudflareaccess.com%2Fcdn-cgi%2Faccess%2Flogout%3FreturnTo%3Dhttps%253A%252F%252Fwenzelarifiandi.com%252F"
```

Response:
- ✅ HTTP 302 Found
- ✅ Clean redirect to logout UI
- ✅ No "Application error"

## How to Apply

### Option 1: Manual Terraform Apply

```bash
cd infrastructure/terraform

# Set required variables
export TF_VAR_cloudflare_api_token="your_token"
export TF_VAR_cipher_client_id="340307158316941421"
export TF_VAR_cipher_client_secret="your_secret"

# Plan and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Option 2: GitHub Actions Workflow

If you have a workflow that deploys `infrastructure/terraform`, trigger it to apply these changes.

### Option 3: Manual Cloudflare Dashboard (RECOMMENDED)

**Note**: The Terraform API token lacks zone-level permissions. Manual configuration required.

#### Step 1: Cache Rules (Rules → Cache Rules)

Create a single cache rule:
- **Name**: Cipher ZITADEL Cache Bypass
- **Expression**:
```
(http.host eq "cipher.wenzelarifiandi.com" and (
  starts_with(http.request.uri.path, "/.well-known/") or
  starts_with(http.request.uri.path, "/oidc/v1/") or
  starts_with(http.request.uri.path, "/oauth/v2/") or
  starts_with(http.request.uri.path, "/ui/") or
  starts_with(http.request.uri.path, "/assets/")
))
```
- **Action**: Set cache settings → **Cache: OFF**, **Respect Origin Cache-Control: ON**

#### Step 2: Configuration Rules (Rules → Configuration Rules)

Create a single configuration rule:
- **Name**: Cipher ZITADEL Feature Disable
- **Expression**: Same as above
- **Settings**:
  - Auto Minify: **OFF** (all: HTML, CSS, JS)
  - Rocket Loader: **OFF**
  - Email Obfuscation: **OFF**
  - Mirage: **OFF**
  - Polish: **OFF**
  - Early Hints: **OFF**
  - Zaraz: **Disabled**

#### Step 3: Page Rules (Rules → Page Rules)

Create 6 page rules (free tier allows 3, paid allows more):

**If free tier (3 rules max):**
1. `cipher.wenzelarifiandi.com/ui/*`
2. `cipher.wenzelarifiandi.com/oidc/*`
3. `cipher.wenzelarifiandi.com/assets/*`

**If paid tier (recommended - 6 rules):**
1. `cipher.wenzelarifiandi.com/.well-known/*`
2. `cipher.wenzelarifiandi.com/oidc/v1/*`
3. `cipher.wenzelarifiandi.com/oauth/v2/*`
4. `cipher.wenzelarifiandi.com/ui/*`
5. `cipher.wenzelarifiandi.com/ui/v2/*`
6. `cipher.wenzelarifiandi.com/assets/*`

**Settings for EACH rule**:
- Cache Level: **Bypass**
- Email Obfuscation: **Off**
- Rocket Loader: **Off**
- Auto Minify: **Off**
- Mirage: **Off**
- Polish: **Off**
- Automatic HTTPS Rewrites: **Off**

#### Step 4: WAF Custom Rules (Security → WAF → Custom rules)

Create a skip rule:
- **Name**: Cipher ZITADEL WAF Bypass
- **Expression**: Same as cache rule
- **Action**: **Skip** → All remaining custom rules + Managed rulesets

#### Step 5: Zero Trust Check (Zero Trust → Access → Applications)

- Go to Applications list
- Search for `cipher.wenzelarifiandi.com`
- **Expected**: No results (cipher should NOT be behind Access)
- **If found**: Either delete the app OR add path exclusions for all 6 paths above

#### Step 6: Purge Cache

After applying all rules:
1. Go to **Caching → Configuration**
2. Click **Purge Cache** → **Custom Purge**
3. **Hostnames**: `cipher.wenzelarifiandi.com`
4. Click **Purge**

## Verification & Health Checks

### 1. OIDC Endpoint Check
```bash
curl -sSI "https://cipher.wenzelarifiandi.com/oidc/v1/end_session?client_id=340307158316941421&post_logout_redirect_uri=https%3A%2F%2Fwenzelarifiandi.cloudflareaccess.com%2Fcdn-cgi%2Faccess%2Flogout"
```

**Expected**:
- HTTP 302 or 303
- `Location:` header present
- No Cloudflare error HTML
- No `CF-Cache-Status: HIT` (cache should be bypassed)

### 2. UI Endpoint Check
```bash
# Test login UI loads
curl -sSI "https://cipher.wenzelarifiandi.com/ui/v2/login/loginname"
```

**Expected**:
- HTTP 200 or 302
- `Content-Type: text/html` or redirect
- No Cloudflare error page
- No `CF-Cache-Status` or `CF-Cache-Status: DYNAMIC`

### 3. Assets Check
```bash
# Test JS/CSS assets load
curl -sSI "https://cipher.wenzelarifiandi.com/assets/main.js" 2>&1 | grep -E "HTTP|Content-Type|CF-"
curl -sSI "https://cipher.wenzelarifiandi.com/ui/console/assets/main.css" 2>&1 | grep -E "HTTP|Content-Type|CF-"
```

**Expected**:
- HTTP 200
- Proper `Content-Type` (application/javascript, text/css)
- No cache hits on first request after purge
- No Cloudflare errors

### 4. Browser DevTools Check

Open https://cipher.wenzelarifiandi.com/ui/v2/login in browser with DevTools:

**Network Tab**:
- All requests to `/ui/*` and `/assets/*` return **200 OK**
- No 4xx/5xx errors
- No Cloudflare challenge/error pages
- Check response headers: no `CF-Cache-Status: HIT` initially

**Console Tab**:
- No CSP (Content Security Policy) errors
- No "RocketLoader" errors
- No minification/parsing errors
- ZITADEL UI renders correctly

### 5. Full Auth Flow Test

1. Visit https://wenzelarifiandi.com/maker
2. Should redirect to Cloudflare Access
3. Should redirect to Cipher login
4. Login with valid credentials
5. Should redirect back to /maker
6. Click logout
7. Should clear Cipher session → CF Access → home

**Expected**: No "Application error" at any step, UI renders cleanly

## Related Files

- `infrastructure/terraform/cloudflare.tf` - Terraform configuration
- `site/src/pages/logout.ts` - Unified logout flow
- `site/src/pages/api/zitadel/slo.ts` - Session revocation API
- `infrastructure/CLOUDFLARE_ACCESS_SETUP.md` - Access configuration docs

# Ariane AI Agent Instructions

## Monorepo Architecture

- **site/**: Astro app (Node 22.x, Vercel serverless, output: "server"). Data from Sanity via GROQ. Auth via multi-mode middleware (`AUTH_MODE`: `public`/`app`/`cf-access-only`). Key files: `astro.config.mjs`, `src/middleware.ts`, `src/lib/cfAccess.ts`, `src/lib/sanity.ts`, `vercel.json` with `ignoreCommand` gating.
- **studio/**: Sanity Studio CMS (Vercel, deploys via hook when `studio/**` changes on `main`). Schema types in `schemas/`, exported via `schemaTypes/index.ts`. Custom actions in `actions/approveAccessRequest.ts`.
- **zitadel/**: Dockerized auth server (Zitadel v2.65.1 + Postgres 16 + Caddy reverse proxy). Integrates with Cloudflare Access JWT validation. Key files: `docker-compose.yml`, init configs, `scripts/` for health/backup/sync.
- **wasm/**: Rust→WASM modules for hot paths (session signing). Built via `wasm-pack`, fallback to TS implementation.
- **ops/**: Operational docs (Cloudflare Access + GitHub OIDC setup, DNS, troubleshooting).
- **scripts/**: Bash deployment helpers with SSH status checks, health monitoring, and remediation playbooks.
- **tests/**: Testing infrastructure with Vitest (unit/integration), Playwright (e2e), and custom security test suite.

## Developer Workflows

- **Local dev:**
  - `npm run dev:site` (Astro port 4321, host: 127.0.0.1, allowedHosts: "all" for tunnel)
  - `npm run dev:studio` (Sanity Studio)
  - `npm run dev:bubble` (site + named Cloudflare tunnel in one terminal)
  - Tunnel setup: `npm --prefix site run cf:tunnel` (ephemeral) or `cf:tunnel:named` (uses `site/cloudflared/config.yml`)
- **Build/Preview:**
  - `npm run build` (Astro) / `npm run preview`
  - WASM builds: `cd wasm/session-signer && wasm-pack build --target web --release`
- **Deploy gating logic:**
  - `vercel.json` `ignoreCommand`: Only builds if files changed in that workspace AND (`main` branch OR PR with `VERCEL_FORCE_PREVIEW=1`)
  - PR previews: Require label `deploy-preview` + secrets (`VERCEL_TOKEN_SITE`, `VERCEL_ORG_ID_SITE`, `VERCEL_PROJECT_ID_SITE`)
  - Studio: Deploys via webhook when `studio/**` changes on `main` (`VERCEL_STUDIO_DEPLOY_HOOK_URL`)
- **Security automation:**
  - `npm run security:autofix` (CodeQL alert fixes for 8+ vulnerability types)
  - `npm run security:autofix:dry-run` (preview mode)
  - `npm run security:autofix:advanced` (extended patterns, more aggressive)
  - `npm run deps:audit:fix` (dependency vulnerabilities)
- **Testing:**
  - `npm run test` (unit + integration via Vitest)
  - `npm run test:e2e` (Playwright across Chrome/Firefox/Safari)
  - `npm run test:security` (validate security-autofix patterns)
  - `npm run test:all` (comprehensive test suite)
- **Zitadel ops:**
  - Remote status: `scripts/deployment-status.sh` (SSH + health checks)
  - Remote session: `scripts/zitadel-remote-session.sh`
  - Backup/sync: `zitadel/scripts/backup.sh`, `sync-from-oracle.sh`

## Project-Specific Conventions

- **Auth modes:** `AUTH_MODE` determines middleware behavior: `public` (no auth), `app` (session-based), `cf-access-only` (Cloudflare Access JWT). Main site (`wenzelarifiandi.com`) forces `public` for safety. Auth checked via `checkSessionAuth()` (HMAC-signed cookies) or `verifyCfAccessJwt()`.
- **Middleware patterns:** `PUBLIC_PATHS` array bypasses auth. `isApiOrAsset()` handles static assets. Multi-step auth flow: CF Access headers → session auth → redirect to `/access-required`. Security headers applied via `addSecurityHeaders()`.
- **Sanity CMS:** Only active if `PUBLIC_SANITY_PROJECT_ID`/`PUBLIC_SANITY_DATASET` set. Schema workflow: define in `studio/schemas/`, export via `schemaTypes/index.ts`, add GROQ queries in `site/src/lib/queries.ts`. Custom document actions in `studio/actions/`.
- **Cloudflare Access:** JWT validation with configurable group claims (`CF_ACCESS_GROUP_CLAIM`, `CF_ACCESS_REQUIRED_GROUPS`). Protected path prefixes configurable. GitHub OIDC + hardware key MFA documented in `ops/cloudflare-access-github.md`.
- **WASM integration:** Session signer module with fallback. Built to `site/src/lib/wasm/session-signer/`, imports attempted in `signer.ts` with graceful fallback to pure TS implementation.
- **Build optimizations:** Vercel headers for immutable assets (`/_astro/`, static files). HMR configured for tunnel domains via `CF_TUNNEL_HOST`. Source maps disabled in production.
- **Testing patterns:** Vitest with jsdom environment, path aliases (`@site`, `@studio`, `@tests`). Playwright for e2e with mobile device coverage. MSW for API mocking.

## Integration Points & Patterns

- **API routes:** Auth/session endpoints in `site/src/pages/api/auth/*`. GitHub OAuth: `/api/oauth/github/{start,callback}.ts`. Session management uses HMAC-signed cookies with `SESSION_SECRET`. Diagnostic endpoint: `/api/diag`.
- **Environment config:** Critical vars: `AUTH_MODE`, `SESSION_SECRET`, Sanity project ID/dataset, Cloudflare Access settings. Astro config reads from env for domains, HMR tunnel setup. Studio uses hardcoded project ID `tz1p3961`.
- **Security automation:** CodeQL alert processing via `scripts/security-autofix.js` (8+ vulnerability patterns: trivial conditionals, useless assignments, type comparisons, etc.). Conservative fixes with safety limits. Detailed reports in `security-autofix-report.json`.
- **Deployment validation:** SSH-based status checks (`scripts/deployment-status.sh`) compare local vs deployed commit hashes. Health endpoints: Zitadel OpenID config, console UI. Caddy reverse proxy handles SSL termination.
- **Cross-service auth:** Zitadel integrates with Cloudflare Access via JWT validation. Studio approval workflow updates user records. Session state persists across auth modes with configurable fallbacks.

## Troubleshooting & Validation

- **Site preview not deploying:** Check PR label `deploy-preview`, required secrets (`VERCEL_TOKEN_SITE`, `VERCEL_ORG_ID_SITE`, `VERCEL_PROJECT_ID_SITE`), and `ignoreCommand` logic in `site/vercel.json`. PR must touch `site/**` files AND have label.
- **Studio deploy not updating:** Confirm changes under `studio/**` on `main` branch and `VERCEL_STUDIO_DEPLOY_HOOK_URL` secret. Webhook triggers only on main branch pushes affecting studio directory.
- **Cloudflare tunnel issues:** Verify `site/cloudflared/config.yml` tunnel ID and credentials. Restart with `pkill cloudflared` then `npm --prefix site run cf:tunnel:named`. Check port 4321 availability and Astro dev server status.
- **Auth mode conflicts:** Main site domains (`wenzelarifiandi.com`) force `public` mode for safety. Check `determineAuthMode()` logic in middleware. Verify `AUTH_MODE` env var and origin calculation via `getOriginFromHeaders()`.
- **Zitadel operational issues:** Use `scripts/deployment-status.sh` for comprehensive SSH health checks. Check Postgres connectivity, Caddy SSL cert status. Remediation playbooks in `zitadel/scripts/remediation-playbook.md`.
- **WASM build failures:** Ensure `wasm-pack` installed and Rust toolchain available. Check output directory `site/src/lib/wasm/session-signer/` for artifacts. Graceful fallback to TypeScript implementation if import fails.

## Testing & Quality Assurance

- **Unit/Integration tests:** Run via Vitest with jsdom environment. Use path aliases: `@site/lib/utils`, `@studio/schemas`, `@tests/fixtures`
- **E2E tests:** Playwright config covers desktop + mobile browsers. Tests expect local dev server on port 4321 (`npm run dev:site`)
- **Security testing:** Custom `test-scripts/security-autofix.js` validates vulnerability pattern fixes. Run `npm run test:security` before deploying fixes
- **Test file patterns:** `tests/{unit,integration,e2e}/**/*.{test,spec}.{js,ts}` and `{site,studio}/**/*.{test,spec}.{js,ts}`

---

**Feedback:** If any section is unclear or missing, please specify which workflows, conventions, or integration points need more detail.

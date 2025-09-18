# Ariane AI Agent Instructions (concise)

Monorepo map (Node 22):

- `site/` Astro 5 app on Vercel (server output). Auth via middleware. Content via Storyblok; optional Sanity client. Key: `astro.config.mjs`, `src/middleware.ts`, `src/lib/{cfAccess.ts,auth/*,sanity.ts}`, `vercel.json`.
- `studio/` Sanity Studio (separate deploy, projectId `tz1p3961`). Schemas: `schemas/`, exported in `schemaTypes`. Custom action: `actions/approveAccessRequest.ts`.
- `zitadel/` Dockerized Zitadel + Postgres + Caddy. Ops scripts and configs.
- `wasm/` Rust→WASM session signer; JS fallback lives at `site/src/lib/auth/signer.ts`.
- `tests/` Vitest + MSW + Playwright. `vitest.config.ts` defines aliases `@site`, `@studio`, `@tests`.

How it works (auth + content):

- Middleware (`site/src/middleware.ts`) enforces auth based on `AUTH_MODE`:
  - `public` (default): allow through.
  - `app`: require HMAC session cookie (signed by `SESSION_SECRET`, see `signer.ts`).
  - `cf-access-only`: verify Cloudflare Access JWT via `verifyCfAccessJwt()` with optional group checks (`CF_ACCESS_GROUPS_CLAIM`, `CF_ACCESS_REQUIRED_GROUPS`) and an “approved” claim (`CF_ACCESS_APPROVED_*`). Public paths in `PUBLIC_PATHS` and assets bypass.
- Storyblok: `@storyblok/astro` configured in `site/astro.config.mjs` (map of blok components). Requires `STORYBLOK_TOKEN` in `site/.env`. Preview param `_storyblok` triggers relaxed framing headers in `addSecurityHeaders()` to allow the editor iframe.
- Sanity: `site/src/lib/sanity.ts` is guarded; only active when `PUBLIC_SANITY_*` envs are set. Studio is independent and deploys separately.

Developer workflows:

- Local dev: `npm run dev:site` (Astro at `127.0.0.1:4321`). Studio: `npm run dev:studio`. Tunnel: `npm --prefix site run cf:tunnel` (ephemeral) or `cf:tunnel:named` (uses `site/cloudflared/config.yml`). Combined: `npm run dev:bubble`.
- Build/preview: `npm --prefix site run build` and `preview`. WASM optional: `cd site && npm run wasm:build:signer` to place artifacts in `site/src/lib/wasm/session-signer/`.
- Tests (root): `npm run test` (unit+integration), `npm run test:e2e` (Playwright), `npm run test:security` (CodeQL autofix validation). MSW is initialized in `tests/setup/vitest.setup.ts`.
- Deploy gating: `site/vercel.json` `ignoreCommand` builds only when site files change (main or PR with preview forced). PR previews require `deploy-preview` label + Vercel secrets.

Key integration points:

- API routes under `site/src/pages/api/**`:
  - GitHub OAuth: `/api/oauth/github/{start,callback}.ts`
  - WebAuthn: `/api/auth/{registration-options,verify-registration,authentication-options,verify-authentication}.ts`
  - Session: `/api/auth/session.ts`, logout, approval-status, access-request email; diagnostics: `/api/diag` and `/api/oidc/diag`.
- Security headers added centrally by `addSecurityHeaders()`; for Storyblok preview, CSP `frame-ancestors` allows `*.storyblok.com`.

Conventions and gotchas:

- Public domain safety: on `wenzelarifiandi.com`, `determineAuthMode()` forces `public` even if `AUTH_MODE=app`.
- Env you’ll commonly need: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, optional `PUBLIC_SANITY_*`.
- Path aliases in tests: import from `@site`, `@studio`, `@tests`; E2E assumes site is running on port 4321.

Ops and troubleshooting (quick):

- Tunnel flaky? Restart: `pkill cloudflared` then `npm --prefix site run cf:tunnel:named`.
- Preview not deploying? Ensure PR touches `site/**`, label `deploy-preview`, and Vercel tokens are configured; see `site/vercel.json`.
- WASM signer missing? It silently falls back to Node crypto; build via `npm --prefix site run wasm:build:signer` for perf.
- Zitadel/infra status and remediation: `scripts/deployment-status.sh`, docs in `ops/` and `zitadel/README.md`.

Feedback: If any area needs deeper detail (e.g., CF Access group mapping, Studio webhook flow, or Storyblok component mapping), tell me what to expand next.

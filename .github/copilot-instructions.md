# Ariane — Copilot Instructions (concise)

Monorepo map (Node 22)

- `site/` Astro 5 app on Vercel. Auth via middleware. Content: Storyblok (default) + optional Sanity client. Key: `astro.config.mjs`, `src/middleware.ts`, `src/lib/{cfAccess.ts,auth/*,sanity.ts}`, `vercel.json`.
- `studio/` Sanity Studio (separate deploy). Schemas in `studio/schemas/**`, exported via `studio/schemaTypes/index.ts`.
- `zitadel/` Dockerized Zitadel + Postgres + Caddy (infra config, ops docs).
- `wasm/` Rust→WASM session signer; JS fallback at `site/src/lib/auth/signer.ts`.
- `tests/` Vitest + MSW + Playwright. Aliases in `vitest.config.ts`: `@site`, `@studio`, `@tests`.

Architecture essentials

- Middleware `site/src/middleware.ts` gates access by `AUTH_MODE`:
  - `public` (default): allow.
  - `app`: require HMAC session cookie signed with `SESSION_SECRET` (see `auth/signer.ts`, cookie read in `checkSessionAuth`).
  - `cf-access-only`: verify Cloudflare Access JWT via `verifyCfAccessJwt()` (JWKS at `${origin}/cdn-cgi/access/certs`), with optional group gating (`CF_ACCESS_GROUPS_CLAIM`, `CF_ACCESS_REQUIRED_GROUPS`) and “approved” claim (`CF_ACCESS_APPROVED_*`, enforce via `CF_ACCESS_ENFORCE_APPROVED`).
- Bypass: assets and `PUBLIC_PATHS` (e.g., `/api/diag`, OAuth start/callback). Storyblok preview param `_storyblok` relaxes `X-Frame-Options` and adds CSP `frame-ancestors` to allow `*.storyblok.com` in `addSecurityHeaders()`.
- Content:
  - Storyblok wired in `site/astro.config.mjs` (`@storyblok/astro`), needs `STORYBLOK_TOKEN` in `site/.env`.
  - Sanity is optional: read via `site/src/lib/sanity.ts` (`fetchSanity<T>()`), server writes via `sanityServer.ts`. Studio lives in `studio/` and deploys separately.

Key integration points

- API routes `site/src/pages/api/**`:
  - OAuth: `/api/oauth/github/{start,callback}.ts`
  - WebAuthn: `/api/auth/{registration-options,verify-registration,authentication-options,verify-authentication}.ts`
  - Session & access: `/api/auth/{session,logout,approval-status,request-access}.ts`
  - Diagnostics: `/api/diag` and `/api/oidc/diag`
- Security headers centralized in `addSecurityHeaders()` (in `middleware.ts`). Don’t duplicate header logic elsewhere.

Developer workflows

- Local dev: `npm run dev:site` (http://127.0.0.1:4321), Studio: `npm run dev:studio`. Tunnel: `npm --prefix site run cf:tunnel` or `cf:tunnel:named` (uses `site/cloudflared/config.yml`). Combo: `npm run dev:bubble`.
- Build/preview: `npm --prefix site run build` then `preview`. Optional WASM: `npm --prefix site run wasm:build:signer` (artifacts at `site/src/lib/wasm/session-signer/`, falls back to Node crypto if absent).
- Tests (root): `npm run test` (unit+integration), `npm run test:e2e` (Playwright), `npm run test:security` (CodeQL autofix validation). MSW is initialized in `tests/setup/vitest.setup.ts`.
- Vercel gating: `site/vercel.json` `ignoreCommand` only builds when `site/**` changed on `main` or when PR preview is forced. PR previews require label `deploy-preview` and Vercel secrets.

Conventions and gotchas

- On `wenzelarifiandi.com` domains, `determineAuthMode()` forces `public` even if `AUTH_MODE=app`.
- Common env: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, optional `PUBLIC_SANITY_*`.
- Tests and E2E assume the site runs on port `4321`.
- Sanity patterns: add schema in `studio/schemas/**`, export in `studio/schemaTypes/index.ts`, query from `site/src/lib/queries.ts`, fetch via `fetchSanity()`.

Ops quick notes

- Tunnel flaky? `pkill cloudflared` then `npm --prefix site run cf:tunnel:named`.
- Preview not deploying? Ensure PR touches `site/**`, add `deploy-preview` label, and set Vercel tokens; see `site/vercel.json`.
- For Zitadel/infra runbooks, see `ops/` and `zitadel/README.md`.

# Ariane — Copilot Instructions (concise)

Monorepo map (Node 22)

- `site/` Astro 5 app on Vercel. Auth via middleware. Content: Storyblok (default) + optional Sanity. Key: `astro.config.mjs`, `src/middleware.ts`, `src/lib/{cfAccess.ts,auth/*,sanity.ts,sanityServer.ts}`, `vercel.json`.
- `studio/` Sanity Studio (separate deploy). Schemas in `studio/schemas/**`, exported from `studio/schemaTypes/index.ts`.
- `wasm/` Rust→WASM session signer; JS fallback at `site/src/lib/auth/signer.ts`.
- `tests/` Vitest + MSW + Playwright. Aliases in `vitest.config.ts`: `@site`, `@studio`, `@tests`.
- `zitadel/` Infra config and docs; not required for local site dev.

Architecture essentials

- Middleware `site/src/middleware.ts` enforces `AUTH_MODE`:
  - `public` (default): allow.
  - `app`: require HMAC session cookie signed with `SESSION_SECRET` (see `auth/signer.ts`; checked in `checkSessionAuth`).
  - `cf-access-only`: verify Cloudflare Access JWT via `verifyCfAccessJwt()` (JWKS at `${origin}/cdn-cgi/access/certs`). Optional gates: groups (`CF_ACCESS_GROUPS_CLAIM`, `CF_ACCESS_REQUIRED_GROUPS`), approved claim (`CF_ACCESS_APPROVED_*`, enable via `CF_ACCESS_ENFORCE_APPROVED`). Protected path prefixes from `CF_ACCESS_PROTECTED_PREFIXES`.
- Public bypass: assets and `PUBLIC_PATHS` (OAuth, auth/session/logout, `/api/diag`, etc.). Storyblok preview (`?_storyblok`) relaxes `X-Frame-Options` and sets CSP `frame-ancestors` in `addSecurityHeaders()`; header logic lives only here.
- Content sources:
  - Storyblok via `@storyblok/astro` (configure `STORYBLOK_TOKEN` in `site/.env`).
  - Sanity optional: read via `site/src/lib/sanity.ts` (`fetchSanity<T>()`, `urlFor()`), server writes via `site/src/lib/sanityServer.ts` (`isApproved()`, `createAccessRequest()`).

Key integration points

- API routes `site/src/pages/api/**`:
  - OAuth: `/api/oauth/github/{start,callback}.ts`
  - WebAuthn: `/api/auth/{registration-options,verify-registration,authentication-options,verify-authentication}.ts`
  - Session & access: `/api/auth/{session,logout,approval-status,request-access}.ts`
  - Diagnostics: `/api/diag`, `/api/oidc/diag`
- Security headers centralized in `addSecurityHeaders()`; don’t duplicate headers elsewhere. Vercel also sets defaults in `site/vercel.json`.

Developer workflows

- Local dev: `npm run dev:site` (http://127.0.0.1:4321). Studio: `npm run dev:studio`. Tunnel: `npm --prefix site run cf:tunnel` or `cf:tunnel:named` (uses `site/cloudflared/config.yml`). Combo: `npm run dev:bubble`.
- Build/preview: `npm --prefix site run build` then `npm --prefix site run preview`. Optional WASM: `npm --prefix site run wasm:build:signer` (outputs under `site/src/lib/wasm/session-signer/`; runtime falls back automatically).
- Tests (root): `npm run test` (unit+integration), `npm run test:e2e` (Playwright), `npm run test:security`. MSW bootstraps in `tests/setup/vitest.setup.ts`. E2E assumes server at port 4321 (see `playwright.config.ts`).
- Vercel gating: `site/vercel.json` `ignoreCommand` builds only when `site/**` changed on `main` or when PR preview is forced (label `deploy-preview` via CI). Headers and rewrites are defined there.

Conventions & gotchas

- On `wenzelarifiandi.com` domains, `determineAuthMode()` forces `public` even if `AUTH_MODE=app`.
- Common env: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, optional `PUBLIC_SANITY_*` and `SANITY_WRITE_TOKEN` (server writes).
- Sanity queries live in `site/src/lib/queries.ts`; fetch via `fetchSanity()`. Tests/e2e expect port `4321`.
- Security headers: modify only in middleware (runtime) or `site/vercel.json` (deploy-time). Avoid duplicating per-route headers.

Ops quick notes

- Tunnel flaky? `pkill cloudflared` then `npm --prefix site run cf:tunnel:named`.
- Preview not deploying? Ensure PR touches `site/**`, add label `deploy-preview`, configure Vercel tokens; see `site/vercel.json` and repo README for CI details.
- Infra and Zitadel runbooks: `ops/`, `zitadel/README.md`.

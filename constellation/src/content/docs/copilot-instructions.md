---
title: "Ariane — Copilot instructions (concise)"
description: "# Ariane — Copilot instructions (concise)"
slug: copilot-instructions
---

# Ariane — Copilot instructions (concise)

This file is the canonical short guide for automated coding agents working in this monorepo. Keep it brief, concrete, and repository-specific.

Key layout

- `site/` — Astro 5 frontend (Vercel). Pages: `site/src/pages/**`. API routes: `site/src/pages/api/**`. Middleware & edge logic: `site/src/middleware.ts`.
- `studio/` — Sanity Studio (v4). Schemas: `studio/schemas/**`. Export list: `studio/schemaTypes/index.ts`.
- `wasm/` — optional Rust→WASM signer; JS fallback: `site/src/lib/auth/signer.ts` (see `preloadSignerWasm()` comment).

Auth & security (high priority)

- Middleware entry: `site/src/middleware.ts` — respects `AUTH_MODE` (`public|app|cf-access-only`) and centralises security headers via `addSecurityHeaders()`. Do not duplicate header logic elsewhere.
- Session signing: `site/src/lib/auth/signer.ts` (WASM optional). Tests set `SESSION_SECRET` in `tests/setup/vitest.setup.ts`.
- Cloudflare Access helpers: `site/src/lib/cfAccess.ts` — used from middleware to verify Access JWTs and optional group gating.

Developer workflows (concrete commands)

- Local site dev: `npm run dev:site` (site serves on `127.0.0.1:4321`).
- Studio dev: `npm run dev:studio` (Sanity Studio).
- Build/preview site: `npm --prefix site run build` && `npm --prefix site run preview`.
- WASM signer build (optional): `npm --prefix site run wasm:build:signer`.
- Run tests (root): `npm run test`. Note: Playwright E2E expects the site on port `4321`.

Quick map & common files

- Sanity reads: `site/src/lib/sanity.ts` — use `fetchSanity<T>(groq, params)` (CDN, published). Writes/server: `site/src/lib/sanityServer.ts` (requires `SANITY_WRITE_TOKEN`).
- Queries centralised: `site/src/lib/queries.ts` — import queries from here; avoid inlining long GROQ expressions.
- Pages examples: `site/src/pages/work/index.astro` (list projects), `site/src/pages/work/[slug].astro` (project details).
- Auth endpoints: `site/src/pages/api/auth/**` (OAuth/session handlers). Cookie signing uses `site/src/lib/auth/signer.ts`.

Conventions & project-specific patterns

- Security headers: only change via `addSecurityHeaders()` in middleware or `site/vercel.json` deploy headers. `site/vercel.json` uses `ignoreCommand` to skip builds when irrelevant files change.
- Optional WASM pattern: dynamic import + JS fallback used in `site/src/lib/auth/signer.ts` to keep local dev simple for contributors without Rust toolchains.
- Environment names used consistently: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, `PUBLIC_SANITY_*`, `SANITY_WRITE_TOKEN`.
- Tests & mocks: MSW bootstraps in `tests/setup/vitest.setup.ts`; node `crypto` and DOM observers are mocked there — follow that setup when adding tests.

Sanity content workflow (how to add a type)

1. Add a schema file under `studio/schemas/` and export it in `studio/schemaTypes/index.ts`.
2. Add a GROQ query to `site/src/lib/queries.ts`.
3. Use `fetchSanity` in pages/components (e.g., `site/src/pages/...`) to render content.

Automation & dependency policy (must preserve)

- DO NOT accept automated PRs that downgrade dependencies. If a workflow or autofix proposes a downgrade, update the workflow and leave a comment explaining why downgrades are disallowed.
- Inspect `.github/workflows/*` before changing dependency automation; some workflows intentionally gate upgrades.

# Ariane — Copilot instructions (concise)

This is the short, actionable guide for automated coding agents working in this monorepo. Keep answers and edits repository-specific, small, and reversible.

Key layout (quick)

- `site/` — Astro 5 frontend (Vercel). Pages: `site/src/pages/**`. API routes and middleware: `site/src/pages/api/**`, `site/src/middleware.ts`.
- `studio/` — Sanity Studio (v4). Schemas live under `studio/schemas/` and must be exported in `studio/schemaTypes/index.ts`.
- `constellation/`, `infra/`, `infrastructure/`, `ops/` — infra/ops docs and scripts. See `scripts/` for operational helpers.

Auth & security (high priority)

- Middleware entry: `site/src/middleware.ts` — respects `AUTH_MODE` (`public|app|cf-access-only`) and centralises security headers via `addSecurityHeaders()`. Do not duplicate header logic.
- Session signing: `site/src/lib/auth/signer.ts` (WASM optional; JS fallback). Tests set `SESSION_SECRET` in `tests/setup/vitest.setup.ts`.
- Cloudflare Access helpers: `site/src/lib/cfAccess.ts` — used by middleware for Access JWT verification.

Developer workflows (concrete commands)

- Local site dev: `npm run dev:site` (serves on 127.0.0.1:4321).
- Studio dev: `npm run dev:studio`.
- Build & preview site: `npm --prefix site run build` && `npm --prefix site run preview`.
- WASM signer build (optional): `npm --prefix site run wasm:build:signer`.
- Run tests (root): `npm run test` — Playwright E2E expects the site on port 4321.

Important patterns & examples

- Sanity reads: use `site/src/lib/sanity.ts` and `fetchSanity<T>(groq, params)`. Server writes live in `site/src/lib/sanityServer.ts` (requires `SANITY_WRITE_TOKEN`).
- Queries centralised: `site/src/lib/queries.ts` — import queries rather than inlining long GROQ.
- Optional WASM pattern: dynamic import + JS fallback in `site/src/lib/auth/signer.ts` to avoid forcing Rust toolchains for local dev.
- Tests & mocks: MSW bootstraps in `tests/setup/vitest.setup.ts`. Node `crypto` & DOM observers are mocked there.

Repo-specific constraints

- Security headers: only change via `addSecurityHeaders()` in `site/src/middleware.ts` or `site/vercel.json` deploy headers.
- Env names used consistently: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, `PUBLIC_SANITY_*`, `SANITY_WRITE_TOKEN`.
- Dependency policy: DO NOT accept automated PRs that downgrade dependencies. Inspect `.github/workflows/*` before changing dependency automation.

Where to look when stuck (examples)

- Auth/edge: `site/src/middleware.ts`, `site/src/lib/auth/*`, `site/src/lib/cfAccess.ts`.
- Content/queries: `site/src/lib/sanity.ts`, `site/src/lib/sanityServer.ts`, `site/src/lib/queries.ts`.
- Pages/components: `site/src/pages/**`, `site/src/components/**`.
- Infra & ops: `scripts/`, `infra/`, `infrastructure/`, `constellation/` and `docs/agents/*` (eg. `docs/agents/CLAUDE.md`) — contains operational procedures and server access notes; do not include secrets in edits.

Quick edit contract (what we change and how)

- Small, targeted PRs only: one concern per change, include tests or a smoke check when possible.
- Preserve security and env behavior: do not change middleware header logic or secret handling without explicit tests and justification.

If you update this file, keep it short and preserve the dependency-downgrade warning at the bottom.

---

Feedback: anything missing or unclear? Point to files or examples you want expanded.

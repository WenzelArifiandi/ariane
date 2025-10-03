# Ariane — Copilot instructions (concise)

This file is the canonical short guide for automated coding agents working in this monorepo. Keep it brief, concrete, and repository-specific.

## Architecture overview

- `site/` — Astro 5 frontend (Vercel). Pages: `site/src/pages/**`. API routes: `site/src/pages/api/**`. Middleware & edge logic: `site/src/middleware.ts`.
- `studio/` — Sanity Studio (v4). Schemas: `studio/schemas/**`. Export list: `studio/schemaTypes/index.ts`.
- `infrastructure/` — Terraform (Proxmox VMs, Cloudflare Access) + Ansible automation. See `infrastructure/deploy.sh` for main workflows.
- `constellation/` — Documentation site (Astro + Starlight).
- `wasm/` — Optional Rust→WASM signer; JS fallback: `site/src/lib/auth/signer.ts` (see `preloadSignerWasm()` comment).
- `ops/`, `scripts/` — Operational procedures and server management helpers.

## Auth & security (high priority)

- **Middleware entry**: `site/src/middleware.ts` — respects `AUTH_MODE` (`public|app|cf-access-only`) and centralises security headers via `addSecurityHeaders()`. Do NOT duplicate header logic elsewhere.
- **Session signing**: `site/src/lib/auth/signer.ts` (WASM optional). Tests set `SESSION_SECRET` in `tests/setup/vitest.setup.ts`.
- **Cloudflare Access**: `site/src/lib/cfAccess.ts` — used from middleware to verify Access JWTs and group gating. Terraform config in `infrastructure/cloudflare-access/`.
- **Infrastructure auth**: Proxmox server at `54.39.102.214`. See `docs/agents/CLAUDE.md` for SSH access and server management patterns.

## Developer workflows (concrete commands)

- **Local site dev**: `npm run dev:site` (serves on 127.0.0.1:4321).
- **Studio dev**: `npm run dev:studio` (Sanity Studio).
- **Build/preview site**: `npm --prefix site run build && npm --prefix site run preview`.
- **Cloudflare Tunnel**: `npm run dev:bubble` (dev server + named tunnel). Config: `site/cloudflared/config.yml`.
- **WASM signer build**: `npm --prefix site run wasm:build:signer` (requires Rust toolchain).
- **Run tests**: `npm run test` (Playwright E2E expects site on port 4321).
- **Infrastructure deploy**: `cd infrastructure && ./deploy.sh apply` (Terraform + Ansible).

## Key patterns & files

- **Sanity reads**: `site/src/lib/sanity.ts` — use `fetchSanity<T>(groq, params)` (CDN, published). Server writes: `site/src/lib/sanityServer.ts` (requires `SANITY_WRITE_TOKEN`).
- **Queries centralized**: `site/src/lib/queries.ts` — import queries from here; avoid inlining long GROQ expressions.
- **Auth endpoints**: `site/src/pages/api/auth/**` (OAuth/session handlers). Cookie signing uses `site/src/lib/auth/signer.ts`.
- **Security automation**: `scripts/security-autofix*.js` — automated security fixes. Run via `npm run security:autofix`.

## Project-specific conventions

- **Security headers**: Only change via `addSecurityHeaders()` in middleware or `site/vercel.json` deploy headers. `site/vercel.json` uses `ignoreCommand` to skip builds when irrelevant files change.
- **Optional WASM pattern**: Dynamic import + JS fallback in `site/src/lib/auth/signer.ts` to keep local dev simple for contributors without Rust toolchains.
- **Environment names**: Used consistently: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, `PUBLIC_SANITY_*`, `SANITY_WRITE_TOKEN`.
- **Tests & mocks**: MSW bootstraps in `tests/setup/vitest.setup.ts`; node `crypto` and DOM observers mocked there.
- **Cloudflare deployment**: Automated via `.github/workflows/cloudflare-access.yml` on pushes to main affecting `infrastructure/cloudflare-access/`.

## Infrastructure & deployment

- **Proxmox host**: `neve` (54.39.102.214) — Proxmox VE 9.0.10, 8 cores, 64GB RAM. Currently no VMs running.
- **Zitadel**: Live at `auth.wenzelarifiandi.com` (not on neve yet). DNS points to external host.
- **Vercel**: Site (`site/`) and Studio (`studio/`) deployed separately. Studio uses deploy hooks.
- **Terraform state**: Currently local in CI workflows with auto-import. See `infrastructure/cloudflare-access/ensure-imports.sh`.

## Sanity content workflow

1. Add schema file under `studio/schemas/` and export in `studio/schemaTypes/index.ts`.
2. Add GROQ query to `site/src/lib/queries.ts`.
3. Use `fetchSanity` in pages/components to render content.

## Where to look when stuck

- **Auth/edge**: `site/src/middleware.ts`, `site/src/lib/auth/*`, `site/src/lib/cfAccess.ts`.
- **Content/queries**: `site/src/lib/sanity.ts`, `site/src/lib/sanityServer.ts`, `site/src/lib/queries.ts`.
- **Infrastructure**: `infrastructure/README.md`, `docs/agents/CLAUDE.md`, `ops/proxmox-server.md`.
- **Security**: `scripts/security-autofix*.js`, `.github/workflows/security-*.yml`.
- **Deployment**: `infrastructure/deploy.sh`, `.github/workflows/cloudflare-access.yml`.

## Critical constraints

- **Dependency policy**: DO NOT accept automated PRs that downgrade dependencies. Inspect `.github/workflows/*` before changing dependency automation.
- **Small, targeted PRs**: One concern per change, include tests when possible.
- **Preserve security behavior**: Do not change middleware header logic or secret handling without explicit tests and justification.

---

*Keep this file short and preserve the dependency-downgrade warning above.*

---
title: Ariane — Copilot Instructions (concise)
slug: "copilot-instructions"
description: "# Ariane — Copilot Instructions (concise)"
---



# Ariane — Copilot Instructions (concise)

Canonical quick-start for AI coding agents. Focus on THIS repo’s real patterns; keep edits minimal & secure.

## Structure & Roles

- `site/` Astro 5 app (Vercel). Pages `src/pages/**`, API routes `src/pages/api/**`, edge logic `src/middleware.ts`.
- `studio/` Sanity v4 Studio (schemas `studio/schemas/**`, exported via `studio/schemaTypes/index.ts`).
- `constellation/` Docs (Astro + Starlight).
- `infrastructure/` Terraform + Ansible (Proxmox, Cloudflare Access). Entry: `deploy.sh`.
- `scripts/` & `ops/` Operational automation & server runbooks; security autofix scripts.
- `wasm/` Optional Rust→WASM signer (fallback JS in `site/src/lib/auth/signer.ts`).

## Auth & Security (treat as hot path)

- Central entry: `site/src/middleware.ts` (enforces `AUTH_MODE=public|app|cf-access-only`, sets ALL security headers via `addSecurityHeaders()`). Never duplicate header logic elsewhere.
- Session / cookie signing: `site/src/lib/auth/signer.ts` (dynamic WASM load, JS fallback). Tests set `SESSION_SECRET` in `tests/setup/vitest.setup.ts`.
- Cloudflare Access JWT + group gating: `site/src/lib/cfAccess.ts` (Terraform config under `infrastructure/cloudflare-access/`).
- Security automation: `scripts/security-autofix*.js` (invoke with `npm run security:autofix`). Review diff; do not weaken policies.

## Development Workflows

- Site dev: `npm run dev:site` (port 4321 expected by Playwright E2E).
- Studio dev: `npm run dev:studio` (deploys via Vercel deploy hook + `vercel.json` ignore).
- Preview build locally: `npm --prefix site run build && npm --prefix site run preview`.
- Combined dev + Cloudflare named tunnel: `npm run dev:bubble` (uses `site/cloudflared/config.yml`).
- WASM signer (optional): `npm --prefix site run wasm:build:signer` (requires Rust toolchain present) — always keep JS fallback intact.
- Tests: `npm run test` (Vitest + Playwright; ensure site dev server running for E2E where needed).
- Infra apply: `cd infrastructure && ./deploy.sh apply` (Terraform then Ansible orchestration).

## Data & Content Patterns

- Sanity read helper: `site/src/lib/sanity.ts` via `fetchSanity<T>(groq, params)` (CDN published only).
- Server-side mutations: `site/src/lib/sanityServer.ts` (needs `SANITY_WRITE_TOKEN`).
- Consolidate GROQ: add/update in `site/src/lib/queries.ts` — import from there instead of inlining long queries.
- Content workflow: (1) create schema file (2) export in `studio/schemaTypes/index.ts` (3) add GROQ in `queries.ts` (4) consume via `fetchSanity`.

## Deployment & Preview Nuances

- Vercel `ignoreCommand` in `site/vercel.json` and `studio/vercel.json` prevents unnecessary builds; PR site previews gated by workflow + `VERCEL_FORCE_PREVIEW=1` label flow.
- Keep security headers changes isolated to middleware or `site/vercel.json`.

## Infrastructure Snapshot (Oct 2025)

- Proxmox host `neve` (54.39.102.214) online; currently no active VMs/LXCs (Zitadel still on external host). Details & SSH patterns: `docs/agents/CLAUDE.md`, `ops/proxmox-server.md`.
- Cloudflare Access Terraform under `infrastructure/cloudflare-access/` (auto import script: `ensure-imports.sh`).

## Testing & Mocks

- Global test setup: `tests/setup/vitest.setup.ts` (MSW, crypto, DOM observer mocks). Ensure new network calls are either mocked or intentionally exercised.

## Critical Constraints (DO NOT VIOLATE)

- Never downgrade dependencies; reject or amend automated downgrade PRs. Inspect `.github/workflows/*` before altering dependency automation.
- Don’t alter `addSecurityHeaders()` semantics or secret handling without adding/adjusting tests.
- Keep PRs single-concern, minimal surface; add tests/docs for changed behavior.

## Fast Reference When Stuck

Auth/edge: `site/src/middleware.ts`, `site/src/lib/auth/*`, `site/src/lib/cfAccess.ts`
Content: `site/src/lib/sanity.ts`, `site/src/lib/queries.ts`, `studio/schemas/**`
Infra: `infrastructure/README.md`, `deploy.sh`, `docs/agents/CLAUDE.md`
Security: `scripts/security-autofix*.js`, `.github/workflows/security-*.yml`

---

Keep this file concise; retain the dependency‑downgrade warning & security header centralization rule.

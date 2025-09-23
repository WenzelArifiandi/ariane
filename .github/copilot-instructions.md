# Ariane — Copilot instructions (concise)

This file is the canonical short guide for automated coding agents working in this monorepo. Keep it brief, concrete, and repository-specific.

Key layout

- `site/` — Astro 5 frontend (Vercel). Auth and edge behaviour live in `site/src/middleware.ts`.
- `studio/` — Sanity Studio; schemas under `studio/schemas/**` and `studio/schemaTypes/index.ts`.
- `wasm/` — optional Rust→WASM signer; JS fallback is `site/src/lib/auth/signer.ts` (see `preloadSignerWasm()` comment).

Auth & security

- Middleware entry: `site/src/middleware.ts` — respects `AUTH_MODE` (`public|app|cf-access-only`) and centralises security headers via `addSecurityHeaders()`; do not duplicate header logic elsewhere.
- Session signing: `site/src/lib/auth/signer.ts` (WASM optional). Tests set `SESSION_SECRET` in `tests/setup/vitest.setup.ts`.
- Cloudflare Access: helpers in `site/src/lib/cfAccess.ts` and JWT verification called from middleware.

Developer workflows (concrete commands)

- Local site dev: `npm run dev:site` (listens on `127.0.0.1:4321`).
- Studio dev: `npm run dev:studio`.
- Build/preview site: `npm --prefix site run build` then `npm --prefix site run preview`.
- WASM signer build (optional): `npm --prefix site run wasm:build:signer`.
- Tests: run `npm run test` (root). E2E Playwright expects the site on port `4321`.

Conventions & examples to follow

- Don’t change security headers except in `addSecurityHeaders()` (middleware) or `site/vercel.json` (deploy headers). Example: `site/vercel.json` uses an `ignoreCommand` to gate deploys.
- Use `process.env` names consistently: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, `PUBLIC_SANITY_*`, `SANITY_WRITE_TOKEN`.
- Optional WASM: code uses dynamic import to make WASM optional for contributors without Rust toolchains — keep that pattern when editing `site/src/lib/auth/signer.ts`.
- Tests: MSW bootstraps in `tests/setup/vitest.setup.ts`; mock Node `crypto` and DOM observers there.

Automation & dependency policy (must preserve)

- DO NOT accept automated PRs that downgrade dependencies. If a workflow or autofix proposes a downgrade, update the workflow and leave a comment documenting why downgrades are disallowed.
- Check `.github/workflows/*` for scripts that run `npm install`/`npm update` and ensure they only upgrade to secure versions.

Where to look when stuck

- Auth/edge bugs: `site/src/middleware.ts`, `site/src/lib/auth/*`, `site/src/lib/cfAccess.ts`.
- Content sources: `site/src/lib/sanity.ts`, `site/src/lib/sanityServer.ts`, Storyblok integrations in `site/src/components/**`.
- Tests & mocks: `tests/` (MSW handlers in `tests/setup/msw.ts`), vitest config in `vitest.config.ts`.

If you update this file, keep it short and preserve the dependency-downgrade warning at the bottom.

---

Feedback: anything missing or unclear? Reply with areas you want expanded (examples, file snippets, or workflow edits).

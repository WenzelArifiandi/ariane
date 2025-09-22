# Ariane — Copilot Instructions

## Architecture Overview

- **Monorepo Structure**:
  - `site/`: Astro 5 app (Vercel deploy). Auth via middleware. Content from Storyblok (default) and optional Sanity.
  - `studio/`: Sanity Studio (separate deploy). Schemas in `studio/schemas/**`, exported from `studio/schemaTypes/index.ts`.
  - `wasm/`: Rust→WASM session signer; JS fallback at `site/src/lib/auth/signer.ts`.
  - `tests/`: Vitest + MSW + Playwright. Aliases in `vitest.config.ts`: `@site`, `@studio`, `@tests`.
  - `zitadel/`: Infra config and docs; not required for local site dev.

## Key Integration Points

- **Middleware**:

  - `site/src/middleware.ts` enforces `AUTH_MODE` (`public`, `app`, `cf-access-only`).
  - Session cookies signed with `SESSION_SECRET` (see `auth/signer.ts`).
  - Cloudflare Access JWT verified via `verifyCfAccessJwt()`.

- **Content Sources**:

  - Storyblok via `@storyblok/astro` (`STORYBLOK_TOKEN` in `site/.env`).
  - Sanity: read via `site/src/lib/sanity.ts`, server writes via `site/src/lib/sanityServer.ts`.

- **API Routes**:

  - OAuth: `/api/oauth/github/{start,callback}.ts`
  - WebAuthn: `/api/auth/{registration-options,verify-registration,authentication-options,verify-authentication}.ts`
  - Session & access: `/api/auth/{session,logout,approval-status,request-access}.ts`
  - Diagnostics: `/api/diag`, `/api/oidc/diag`

- **Security Headers**:
  - Centralized in `addSecurityHeaders()` (middleware) and `site/vercel.json` (deploy-time).
  - Do not duplicate headers elsewhere.

## Developer Workflows

- **Local Dev**:

  - `npm run dev:site` (http://127.0.0.1:4321)
  - `npm run dev:studio`
  - Tunnel: `npm --prefix site run cf:tunnel` or `cf:tunnel:named`
  - Combo: `npm run dev:bubble`

- **Build/Preview**:

  - `npm --prefix site run build` then `npm --prefix site run preview`
  - Optional WASM: `npm --prefix site run wasm:build:signer`

- **Testing**:

  - Root: `npm run test` (unit+integration), `npm run test:e2e` (Playwright), `npm run test:security`
  - MSW bootstraps in `tests/setup/vitest.setup.ts`
  - E2E expects server at port 4321

- **Vercel Gating**:
  - `site/vercel.json` `ignoreCommand` builds only when `site/**` changes on `main` or PR preview is forced (label `deploy-preview` via CI).

## Conventions & Gotchas

- On `wenzelarifiandi.com` domains, `determineAuthMode()` forces `public` even if `AUTH_MODE=app`.
- Common env: `AUTH_MODE`, `SESSION_SECRET`, `STORYBLOK_TOKEN`, `CF_ACCESS_*`, optional `PUBLIC_SANITY_*`, `SANITY_WRITE_TOKEN`.
- Sanity queries: `site/src/lib/queries.ts`; fetch via `fetchSanity()`.
- Security headers: modify only in middleware or `site/vercel.json`.
- Tests/e2e expect port `4321`.

## Ops Quick Notes

- Tunnel flaky? `pkill cloudflared` then `npm --prefix site run cf:tunnel:named`.
- Preview not deploying? Ensure PR touches `site/**`, add label `deploy-preview`, configure Vercel tokens.
- Infra and Zitadel runbooks: `ops/`, `zitadel/README.md`.

## Automated Dependency Management — Critical Warning

- **Do NOT downgrade dependencies in automated PRs or workflows.**
  - Recent issues have been caused by GitHub Actions (Gemini or security auto-fix flows) creating PRs that resolve problems by lowering dependency versions. This is not allowed and can introduce security or compatibility risks.
- **When updating dependencies:**
  - Only upgrade to newer, secure, and compatible versions.
  - Never resolve issues by reverting to older versions unless explicitly approved by maintainers.
- **Workflow logic:**
  - Audit `.github/workflows/*` for any steps that run `npm install`, `npm update`, or use tools that may downgrade dependencies.
  - Ensure all automated fixes and PRs only propose upgrades or security patches, not downgrades.
- **If you find a workflow or script that downgrades dependencies, fix it immediately and document the change.**

**Example:**

> ❌ Wrong: `npm install some-package@1.0.0` (if latest is 2.x)
> ✅ Correct: `npm install some-package@latest` or upgrade to a secure version

Add a comment in workflow files to warn future agents and contributors.

---

**Feedback requested:**  
Are there any sections that need more detail, or specific patterns you want documented further? Let me know if anything is unclear or missing.

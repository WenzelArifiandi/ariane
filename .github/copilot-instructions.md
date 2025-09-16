## AI Agent Quickstart for Ariane

Monorepo overview (Node `22.x`, independent deploys):
- `site/` — Astro app (`output: "server"`) on Vercel; data from Sanity via GROQ.
- `studio/` — Sanity Studio on Vercel; deploys via hook when `studio/**` changes on `main`.

Local dev (fast path):
- Root helpers: `npm run dev:site`, `npm run dev:studio`, `npm run dev:bubble` (site + named Cloudflare tunnel).
- In `site/`: `npm i && npm run dev` binds `127.0.0.1:4321` with HMR; set `CF_TUNNEL_HOST` to enable HMR over tunnels (`astro.config.mjs`).
- Tunnels: `npm --prefix site run cf:tunnel` (ephemeral) or `cf:tunnel:named` using `site/cloudflared/config.yml`.

Vercel configuration (build gating + caching):
- `site/vercel.json`: `ignoreCommand` skips builds unless on `main` or PR with changes; long-cache for `/_astro/*` and assets; rewrites `/favicon.ico -> /favicon.svg`.
- `studio/vercel.json`: `ignoreCommand` skips unless `main` changed under `studio/`.

CI & PR previews (GitHub Actions):
- Site preview deploys are label-gated via `.github/workflows/preview-deploy-site.yml` using `vercel build`/`vercel deploy --prebuilt` with `--build-env VERCEL_FORCE_PREVIEW=1`.
- Studio deploys via Vercel Deploy Hook in `.github/workflows/studio-deploy.yml` when `studio/**` changes on `main`.
- Required secrets: `VERCEL_TOKEN_SITE`, `VERCEL_ORG_ID_SITE`, `VERCEL_PROJECT_ID_SITE`, and `VERCEL_STUDIO_DEPLOY_HOOK_URL` (for the Studio hook).

Auth modes and middleware (`site/src/middleware.ts`):
- `AUTH_MODE=public|app|cf-access-only` controls enforcement.
   - `public` (default): no in-app auth.
   - `app`: require signed `session` cookie (HMAC in `site/src/lib/auth/signer.ts`); redirects to `/access-required` with absolute origin from proxy headers.
   - `cf-access-only`: trust Cloudflare Access; optional group/approval checks via CF JWT.
- Public paths and assets bypass auth; origin is derived via `getOriginFromHeaders` for proxy/tunnel safety.

Cloudflare Access utilities (`site/src/lib/cfAccess.ts`):
- Verify JWT against `/<origin>/cdn-cgi/access/certs`; derive origin from headers.
- Env-driven controls:
   - `CF_ACCESS_PROTECTED_PREFIXES` (comma list), `CF_ACCESS_GROUPS_CLAIM` (default `groups`), `CF_ACCESS_REQUIRED_GROUPS`.
   - Approval flag: `CF_ACCESS_APPROVED_CLAIM` (default `https://wenzelarifiandi.com/approved`), `CF_ACCESS_ENFORCE_APPROVED=true`.
   - Setup guide: see `ops/cloudflare-access-github.md` for protecting tunnels with GitHub sign-in + hardware key.

Sanity integration (`site/src/lib/sanity.ts`):
- Client created only when `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` exist; otherwise `fetchSanity<T>()` returns empty fallback to keep pages stable in dev.
- Images via `urlFor(src).width(...).height(...).fit('max').auto('format').url()`; allowlist `cdn.sanity.io` in `astro.config.mjs`.
- Queries live in `site/src/lib/queries.ts` (e.g., `projectBySlug`, `allProjects`).

Analytics (prod-only):
- `site/src/layouts/Base.astro` includes `@vercel/analytics/astro` and `@vercel/speed-insights/astro` gated by `import.meta.env.PROD`.

Key API routes (discoverable patterns):
- Auth/session: `site/src/pages/api/auth/*` (e.g., `session.ts` checks signed cookie); OAuth GitHub: `api/oauth/github/{start,callback}.ts`.

Common tasks:
- Add a content type: define in `studio/schemas/`, export in `studio/schemaTypes/index.ts`, then add GROQ in `site/src/lib/queries.ts` and render under `site/src/pages/` or components.

Environment variables (site highlights):
- `AUTH_MODE`, `SESSION_SECRET`, `PUBLIC_ORIGIN`, `PUBLIC_SANITY_*`, `CF_*` (as above), optional `PUBLIC_USE_LOCAL_ICONS` to load local Material Symbols in `Base.astro`.

Validate changes quickly:
- Sanity images resolve with width/height params; queries return expected shapes; pages render without runtime fetch errors when `PUBLIC_SANITY_*` is unset.
- Auth: `GET /api/auth/session` reflects cookie state; redirects are absolute behind tunnels/proxies.
- Vercel: unchanged folders are skipped via `ignoreCommand`; assets under `/_astro/` are immutable.

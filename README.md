![Site Preview Deploy](https://github.com/WenzelArifiandi/ariane/actions/workflows/preview-deploy-site.yml/badge.svg?branch=main)
![Studio Deploy (Hook)](https://github.com/WenzelArifiandi/ariane/actions/workflows/studio-deploy.yml/badge.svg?branch=main)
[![🔍 Security Scanning & Analysis](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-scanning.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-scanning.yml)

Monorepo Overview

- site: Production Astro app deployed on Vercel.
- studio: Sanity Studio (CMS) deployed on Vercel.
- archive tag: Removed template `ariane-astrowind` is preserved at tag `archive/ariane-astrowind-20250914`.

Vercel Configuration

- Root Directory:
  - ariane (site): Set Root Directory to `site`.
  - ariane-studio (studio): Set Root Directory to `studio`.
- Skip builds unless relevant changes (main or PR):
  - Both projects include a `vercel.json` `ignoreCommand` that builds only if files under that project changed, and only on `main` or PRs.
  - Site Preview gating: PR builds are skipped unless CI sets `VERCEL_FORCE_PREVIEW=1` (the label‑gated workflow does this). This avoids duplicate PR previews.
  - Commands are defined in `site/vercel.json` and `studio/vercel.json`.
- Runtime:
  - Vercel Serverless uses Node 22. Local dev can be newer, but logs may warn and fall back in production.

Telemetry & Analytics

- Speed Insights: Enabled via `@vercel/speed-insights/astro` in `site/src/layouts/Base.astro` (production-only).
- Vercel Analytics: Enabled via `@vercel/analytics/astro` in the same layout (production-only).

CI (GitHub Actions)

- Workflow builds only the `site` app. The removed `ariane-astrowind` is no longer in the CI matrix.
- Studio on-demand deploys (best practice):
  - Workflow `.github/workflows/studio-deploy.yml` triggers a Studio deploy via Vercel Deploy Hook when `studio/**` changes on `main`.
  - Set the secret `VERCEL_STUDIO_DEPLOY_HOOK_URL` in GitHub → Settings → Secrets and variables → Actions.
  - In Vercel (project ariane-studio): create a Deploy Hook for branch `main`, copy its URL to the secret.
  - Optional: In Vercel ariane-studio, turn off automatic deploys to avoid duplicates and rely on the hook + ignoreCommand.

PR-gated Preview Deploys (Site)

- Label-controlled previews for `site/` using Vercel CLI via GitHub Actions.
- Add repository secrets (GitHub → Settings → Secrets and variables → Actions):
  - `VERCEL_TOKEN_SITE`: Vercel token with access to your team
  - `VERCEL_ORG_ID_SITE`: Organization ID (from Vercel → Settings → Tokens)
  - `VERCEL_PROJECT_ID_SITE`: Project ID for the `site` project
- Workflow: `.github/workflows/preview-deploy-site.yml`
  - Triggers on PRs touching `site/**` when the PR has label `deploy-preview`.
  - Builds with `vercel build` and deploys a Preview with `vercel deploy --prebuilt`.
  - Passes `--build-env VERCEL_FORCE_PREVIEW=1` so the site's `ignoreCommand` allows PR builds only from this workflow.
  - Tip: In the Vercel project (site), you can disable automatic Preview deployments to avoid duplicates, relying on this workflow instead.

Local Studio Deploy Hook

- To manually trigger Studio deploys from your machine:
  - Set `export STUDIO_DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/<HOOK_ID>"`
  - Run: `cd studio && npm run deploy:hook`

Restore Archived Template

- git fetch --tags
- git checkout tags/archive/ariane-astrowind-20250914 -b ariane-astrowind-archive

Local Development

- cd site && npm i && npm run dev
- cd studio && npm i && npm run dev
- Root helper scripts:
  - `npm run deploy:studio` triggers the Studio Deploy Hook using `STUDIO_DEPLOY_HOOK_URL`.
  - `npm run env:site:init` creates `site/.env` from the example (no overwrite).
  - `npm run env:site:open` opens `site/.env` in your default editor.
  - `npm run dev:bubble` starts the site dev server + Cloudflare named tunnel in one terminal.

Dev server access & troubleshooting

- Site dev server binds to all interfaces on port 4321.
  - Local: http://localhost:4321/
  - LAN/Hotspot: use the "Network" URL printed in the terminal (e.g., http://172.20.10.2:4321/)
- If the page doesn't load:
  - Ensure the server is running (look for "astro ready" in the terminal).
  - Kill stray processes and restart: `pkill -f "astro dev" || true && cd site && npm run dev`.
  - Check that nothing else is using port 4321; if needed, change the port in `site/astro.config.mjs` and the `dev` script.

Cloudflare Tunnel (use your domain for dev)

- Install `cloudflared` (macOS): `brew install cloudflared`
- Quick ephemeral tunnel (random subdomain under trycloudflare.com):
  - In one terminal: `npm --prefix site run dev`
  - In another: `npm --prefix site run cf:tunnel`
  - Use the printed URL to access your local dev from anywhere.
- Named tunnel on your domain (recommended):
  1. `cloudflared tunnel login` and pick your Cloudflare zone
  2. `cloudflared tunnel create ariane-dev` (note the Tunnel ID)
  3. Copy `site/cloudflared/config.example.yml` to `config.yml`, set:
     - `tunnel` and `credentials-file` to the created tunnel values
     - `ingress[0].hostname` to a subdomain you control (e.g., `dev.your-domain.tld`)
  4. Create a DNS CNAME in Cloudflare to point that hostname to the tunnel (Cloudflare may auto-create this)
  5. Run dev + named tunnel:
     - In one terminal: `npm --prefix site run dev`
     - In another: `npm --prefix site run cf:tunnel:named`
  6. Visit `https://dev.your-domain.tld`

Notes:

- Do not commit `site/cloudflared/config.yml` or `*.json` tunnel creds; they’re gitignored.
- The tunnel proxies only while your local dev server is running and the tunnel command is active.

Cloudflare Access (protect tunnel with GitHub)

- Follow the step-by-step guide to require GitHub sign-in and a hardware security key for `https://tunnel.wenzelarifiandi.com`:
  - ops/cloudflare-access-github.md

GitHub OAuth test endpoints (optional)

- Start the flow: `/api/oauth/github/start` redirects to GitHub with least-privilege scopes (`read:user user:email`).
- Callback: `/api/oauth/github/callback` exchanges the code and shows a simple success page.
- Configure env vars in `site/.env` (see `site/.env.example`).

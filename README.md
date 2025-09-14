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
  - Command used:
    if [ "$VERCEL_GIT_COMMIT_REF" != "main" ] && [ -z "$VERCEL_GIT_PULL_REQUEST_ID" ]; then exit 0; fi; git diff --quiet HEAD^ HEAD -- . 2>/dev/null && exit 0 || exit 1
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

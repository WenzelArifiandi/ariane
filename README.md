# Ariane

> A modern authentication and authorization system built with Zitadel, featuring automated security scanning and deployment workflows.

## 📊 System Status

### 🚀 Deployment & CI/CD

[![CI](https://github.com/WenzelArifiandi/ariane/actions/workflows/ci.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/ci.yml)
[![🚀 Deploy Zitadel to Oracle Cloud](https://github.com/WenzelArifiandi/ariane/actions/workflows/deploy-zitadel.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/deploy-zitadel.yml)
[![Site Preview Deploy](https://github.com/WenzelArifiandi/ariane/actions/workflows/preview-deploy-site.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/preview-deploy-site.yml)
[![Studio Deploy (Hook)](https://github.com/WenzelArifiandi/ariane/actions/workflows/studio-deploy.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/studio-deploy.yml)

### 🛡️ Security & Quality

[![�️ Security Scan Suite](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-comprehensive.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-comprehensive.yml)
[![�🔍 Security Scanning & Analysis](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-scanning.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-scanning.yml)
[![🛡️ Auto Security Fixes](https://github.com/WenzelArifiandi/ariane/actions/workflows/auto-security-fixes.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/auto-security-fixes.yml)
[![🔐 Security Setup & Configuration](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-setup.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/security-setup.yml)
[![📊 Update Status Badges](https://github.com/WenzelArifiandi/ariane/actions/workflows/update-status-badges.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/update-status-badges.yml)
[![🧪 Snyk Security Scan (Optional)](https://github.com/WenzelArifiandi/ariane/actions/workflows/snyk-security.yml/badge.svg)](https://github.com/WenzelArifiandi/ariane/actions/workflows/snyk-security.yml)

### 📈 Service Health

[![Zitadel Status](https://img.shields.io/website?url=https%3A%2F%2Fauth.wenzelarifiandi.com%2F.well-known%2Fopenid-configuration&label=Zitadel&style=flat-square)](https://auth.wenzelarifiandi.com/.well-known/openid-configuration)
[![Console Status](https://img.shields.io/website?url=https%3A%2F%2Fauth.wenzelarifiandi.com%2Fui%2Fconsole&label=Console&style=flat-square)](https://auth.wenzelarifiandi.com/ui/console)

### 🔒 Security Metrics

[![CodeQL](https://github.com/WenzelArifiandi/ariane/security/code-scanning/badge.svg?branch=main)](https://github.com/WenzelArifiandi/ariane/security/code-scanning)
[![OSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/WenzelArifiandi/ariane/badge)](https://securityscorecards.dev/viewer/?uri=github.com/WenzelArifiandi/ariane)
[![Known Vulnerabilities](https://snyk.io/test/github/WenzelArifiandi/ariane/badge.svg)](https://snyk.io/test/github/WenzelArifiandi/ariane)
[![Dependabot Status](https://img.shields.io/badge/Dependabot-enabled-brightgreen?style=flat-square&logo=dependabot)](https://github.com/WenzelArifiandi/ariane/security/dependabot)
[![Security Alerts](https://img.shields.io/github/issues-search/WenzelArifiandi/ariane?query=is%3Aopen%20label%3A%22security%22&label=Security%20Alerts&style=flat-square&color=red)](https://github.com/WenzelArifiandi/ariane/security/advisories)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue?style=flat-square&logo=shield)](.github/SECURITY_AUTOMATION.md)

### 📊 Project Info

[![License](https://img.shields.io/badge/License-UNLICENSED-red?style=flat-square)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)](package.json)
[![GitHub last commit](https://img.shields.io/github/last-commit/WenzelArifiandi/ariane?style=flat-square)](https://github.com/WenzelArifiandi/ariane/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/WenzelArifiandi/ariane?style=flat-square)](https://github.com/WenzelArifiandi/ariane/issues)

---

## 🎯 Quick Links

- **🔒 Authentication**: [Zitadel Console](https://auth.wenzelarifiandi.com/ui/console)
- **🔍 Security Dashboard**: [GitHub Security](https://github.com/WenzelArifiandi/ariane/security)
- **🤖 Actions Dashboard**: [GitHub Actions](https://github.com/WenzelArifiandi/ariane/actions)
- **📋 Dependabot**: [Dependency Updates](https://github.com/WenzelArifiandi/ariane/security/dependabot)

---

## 🖥️ Infrastructure

### Proxmox Bare Metal Server

- **Host**: `neve` (54.39.102.214)
- **Hardware**: Intel Xeon E3-1270 v6 @ 3.8GHz (8 cores) | 64GB RAM | 2x 419GB NVMe RAID1
- **OS**: Proxmox VE 9.0.10 on Debian 13
- **Storage**: 384GB ZFS pool for VMs/containers
- **Web UI**: [Proxmox Console](https://54.39.102.214:8006)
- **SSH**: `ssh root@54.39.102.214`

_See [ops/proxmox-server.md](ops/proxmox-server.md) for detailed specs and [CLAUDE.md](CLAUDE.md) for management workflows._

---

## Current deployment reality (Sept 2025)

- Proxmox host `neve` is online, but currently has no QEMU VMs or LXC containers running. Kubernetes (k3s) and the PostgreSQL VM are not yet provisioned here.
- Zitadel is healthy and serving from a different host/IP.
  - DNS now points `auth.wenzelarifiandi.com` to a non-neve IP.
    ```bash
    dig +short auth.wenzelarifiandi.com A | tail -n 1
    # Example observed: 79.72.87.238
    ```
  - Proxmox shows no VMs/LXCs on `neve`:
    ```bash
    ssh root@54.39.102.214 "pvesh get /nodes/neve/qemu --output-format json && echo --- && pvesh get /nodes/neve/lxc --output-format json"
    # => [] and []
    ```

Next steps to move Zitadel to `neve` (at a glance):

- Provision VMs via Terraform, then configure with Ansible (see `infrastructure/` README).
- On the k3s master VM, run the helper to install Argo CD, Portainer, and metrics-server; export kubeconfig for Lens:
  ```bash
  bash scripts/k8s/setup-argo-portainer.sh
  sudo bash scripts/k8s/export-kubeconfig-for-lens.sh /home/ubuntu/k3s.yaml
  ```
- When ready, switch DNS for `auth.wenzelarifiandi.com` to the k3s ingress/LoadBalancer IP.

See also:

- `infrastructure/README.md` → provisioning and cutover
- `scripts/k8s/README.md` → k3s add‑ons (Argo CD, Portainer, Lens, MetalLB/Ingress notes)

## Monorepo Overview

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

- **Terraform Setup**: Automated Cloudflare Zero Trust Access for `cipher.wenzelarifiandi.com`:
  - See: `infrastructure/cloudflare-access/README.md`
  - Quick setup: `cd infrastructure/cloudflare-access && ./setup-local-dev.sh`
- Manual setup guide for tunnel protection with GitHub sign-in and hardware security key:
  - ops/cloudflare-access-github.md

GitHub OAuth test endpoints (optional)

- Start the flow: `/api/oauth/github/start` redirects to GitHub with least-privilege scopes (`read:user user:email`).
- Callback: `/api/oauth/github/callback` exchanges the code and shows a simple success page.
- Configure env vars in `site/.env` (see `site/.env.example`).

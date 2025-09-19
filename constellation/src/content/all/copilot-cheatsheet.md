---
title: Ariane — AI Agent Quick Cheat Sheet
description: "# Ariane — AI Agent Quick Cheat Sheet"
slug: "copilot-cheatsheet"
---

# Ariane — AI Agent Quick Cheat Sheet

Keep `.github/copilot-instructions.md` as the canonical long-form. This is a quick reference for day‑to‑day work.

- Map & paths

  - Site (Astro): `site/` — pages `site/src/pages/**`, API routes `site/src/pages/api/**`
  - Studio (Sanity v4): `studio/` — schemas `studio/schemas/**`, export list `studio/schemaTypes/index.ts`
  - Sanity helpers: reads `site/src/lib/sanity.ts`, writes/admin `site/src/lib/sanityServer.ts`
  - Queries live in `site/src/lib/queries.ts` (import from here; avoid inlining long GROQ)
  - Auth & edge: `site/src/middleware.ts`, app auth helpers `site/src/lib/auth/**`
  - Cloudflare Access helpers: `site/src/lib/cfAccess.ts`

- Run locally

  - Site: `cd site && npm i && npm run dev` (http://127.0.0.1:4321)
  - Studio: `cd studio && npm i && npm run dev`

- Sanity usage

  - Read: `fetchSanity<T>(groq, params)` from `site/src/lib/sanity.ts` (CDN, published)
  - Images: `urlFor(image).width(1200).height(630).fit('crop').auto('format').url()`
  - Write/admin: `serverClient` from `site/src/lib/sanityServer.ts` (requires `SANITY_WRITE_TOKEN`; use only server-side)

- Auth modes (set `AUTH_MODE`)

  - `public` (default): open site
  - `app`: require session (see `site/src/pages/api/auth/**`, cookie signed via `site/src/lib/auth/signer.ts`)
  - `cf-access-only`: trust Cloudflare Access; optional group gating via `CF_ACCESS_PROTECTED_PREFIXES` + `CF_ACCESS_REQUIRED_GROUPS`

- Deploy notes (Vercel)

  - `site/vercel.json` and `studio/vercel.json` use `ignoreCommand` to skip builds when app files didn’t change
  - Site sets cache headers and rewrites (e.g., `/scripts/maker-client`)

- Add a content type

  1. Add schema in `studio/schemas/` and export in `studio/schemaTypes/index.ts`
  2. Add a GROQ query in `site/src/lib/queries.ts`
  3. Use `fetchSanity` in a page/component to render content

- Examples
  - List projects: `site/src/pages/work/index.astro` using `allProjects`
  - Project details: `site/src/pages/work/[slug].astro` using `projectBySlug`
  - OAuth/session endpoints: `site/src/pages/api/auth/**`

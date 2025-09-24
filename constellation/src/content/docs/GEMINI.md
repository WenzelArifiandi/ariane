---
title: "Ariane Monorepo – Gemini Agent Context"
description: "# Ariane Monorepo – Gemini Agent Context"
slug: gemini
---

# Ariane Monorepo – Gemini Agent Context

## Purpose

This repository contains all infrastructure, documentation, and code for the Ariane project. Key subprojects include:

- `constellation/` (Astro + Starlight docs)
- `studio/` (Sanity Studio)
- `wasm/` (Rust/WASM session signer)
- `tests/` (Vitest, Playwright, MSW)
- `zitadel/` (infra config)

## Key Notes

- Docs live in `constellation/src/content/all/`.
- Frontmatter must include at least `title:`.
- Build/preview scripts for docs:
  ```bash
  cd constellation
  npm run build
  npm run preview
  ```
- Studio and WASM have their own build/test workflows.

## Agent Instructions

- Always ensure Markdown files in `constellation/src/content/all` start with valid frontmatter.
- If build errors reference missing slugs, check `constellation/astro.starlight.config.mjs`.
- Prefer fixing frontmatter automatically using `constellation/tools/fix-frontmatter.mjs`.
- For infrastructure, see `zitadel/README.md` and `infrastructure/` scripts.
- For tests, use root-level `npm run test` and `npm run test:e2e`.

You can add more context for each subproject in their own `GEMINI.md` files as needed.

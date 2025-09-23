---
title: Constellation – Ariane Docs
description: "# Constellation – Ariane Docs"
slug: gemini
---



# Constellation – Ariane Docs

## Purpose

This project uses Astro + Starlight to build documentation for Ariane infrastructure.

## Key Notes

- Docs live in `src/content/all/`.
- Frontmatter must include at least `title:`.
- Build/preview scripts:
  ```bash
  npm run build
  npm run preview
  ```

## Agent Instructions

- Always ensure Markdown files in src/content/all start with valid frontmatter.
- If build errors reference missing slugs, check astro.starlight.config.mjs.
- Prefer fixing frontmatter automatically using tools/fix-frontmatter.mjs.

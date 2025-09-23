---
title: Constellation Documentation Management Guide
description: "How to add, edit, and manage documentation in the Constellation site"
slug: constellation_management
---



# Constellation Documentation Management Guide

Constellation is a **file-based documentation system** that automatically syncs markdown files from your repository - it's **not a CMS**. Here's how to manage content.

## How Constellation Works

**File-based Documentation:**
- All docs are `.md` and `.mdx` files stored throughout your repo
- The `sync-md.js` script automatically finds and copies them to `constellation/src/content/docs/`
- Starlight then generates the website from these files

## How to Add/Edit Documentation

### 1. **Edit Existing Docs**
Just edit any `.md` file anywhere in your repo:
```bash
# Edit any markdown file directly
vim docs/security.md
vim ops/README.md
vim infrastructure/SETUP.md
```

### 2. **Add New Documentation**
Create new `.md` files anywhere in your repo:
```bash
# Create new docs anywhere
echo "# New Feature Guide" > features/new-feature.md
```

### 3. **Update the Sidebar**
After adding new docs, update the manual sidebar in:
```javascript
// constellation/astro.starlight.config.mjs
sidebar: [
  {
    label: "Your Category",
    items: [
      { label: "New Feature", link: "/new-feature" },
    ]
  }
]
```

### 4. **Sync and Deploy**
```bash
# Run sync script to copy files
cd constellation && npm run sync

# Build and preview locally
npm run build
npm run preview

# Commit and push to deploy via Vercel
git add . && git commit -m "docs: Add new documentation"
git push
```

## Key Files

- **Content**: Any `.md`/`.mdx` file in your repo
- **Navigation**: `constellation/astro.starlight.config.mjs` (manual sidebar)
- **Sync**: `constellation/scripts/sync-md.js` (auto-copies files)
- **Homepage**: `constellation/src/content/docs/index.mdx` (custom, preserved during sync)

## Workflow Example

1. **Create new documentation:**
   ```bash
   echo "# API Documentation" > api/README.md
   ```

2. **Add to sidebar:**
   ```javascript
   // In constellation/astro.starlight.config.mjs
   {
     label: "API",
     items: [
       { label: "API Documentation", link: "/readme" },
     ]
   }
   ```

3. **Sync and test:**
   ```bash
   cd constellation
   npm run sync
   npm run preview
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "docs: Add API documentation"
   git push
   ```

## Best Practices

- **Use descriptive filenames** - they become the URL slug
- **Add frontmatter** for better metadata:
  ```yaml
  ---
  title: "Custom Page Title"
  description: "Page description for SEO"
  ---
  ```
- **Organize by categories** in the sidebar configuration
- **Test locally** with `npm run preview` before pushing
- **Keep the homepage** (`index.mdx`) updated with navigation links

## Technical Details

- **Framework**: Astro + Starlight
- **Content**: Markdown with frontmatter
- **Deployment**: Vercel (auto-deploys on push to main)
- **Sync**: Automated file copying from repo root to `src/content/docs/`
- **Navigation**: Manual sidebar configuration (no auto-generation)

This is a **docs-as-code** approach - you manage documentation like code, not through a CMS interface.
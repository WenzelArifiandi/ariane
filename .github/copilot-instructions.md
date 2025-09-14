# AI Agent Instructions for Ariane

This document explains the key architectural decisions and patterns in this codebase, why they matter, and how to validate them.

## Project Architecture

The project uses a monorepo pattern to keep related code together while maintaining clear boundaries. This provides:

1. **Single Source of Truth**: All code lives in one repository, making it easier to track changes and dependencies
2. **Independent Deployments**: Each app (`site` and `studio`) can be deployed separately
3. **Type Safety**: Shared types between frontend and CMS ensure data consistency

- **Monorepo Structure**
  - `/site`: Astro.js frontend deployed on Vercel (Node 22.x)
  - `/studio`: Sanity CMS studio deployed on Vercel
  - Components communicate via Sanity Client/GROQ queries

### Key Integration Points

1. **Sanity Integration** (`site/src/lib/sanity.ts`)

   Why this matters:

   - Type-safe GROQ queries prevent runtime errors by catching mismatched data shapes at compile time
   - Environment variables enable different configurations per environment without code changes
   - Image URL builder ensures consistent image optimization and caching across the site

   How to validate:

   - Check GROQ queries compile with `sanity check`
   - Image URLs should include width/height and CDN optimization params
   - TypeScript types should match Sanity schema definitions

2. **Authentication** (`site/src/lib/auth/`)

   Why this matters:

   - WebAuthn eliminates password risks while improving user experience
   - Environment-aware config adapts to dev/prod without code changes
   - Session store provides consistent auth state across components

   How to validate:

   - Auth flows should work in both dev and prod environments
   - Sessions should persist across page reloads
   - Registration should create correct Sanity documents

## Development Workflow

### Local Development

```bash
# Site (Astro frontend)
cd site && npm i && npm run dev

# Sanity Studio
cd studio && npm i && npm run dev
```

### Deployment

- **Site**: Deploys via Vercel (automatic for `main`, PR previews gated by `deploy-preview` label)
- **Studio**: Deploys via webhook when `studio/**` changes on `main`
  - Manual deploy: `cd studio && npm run deploy:hook`

### Project Conventions

1. **Vercel Configuration**

   Why this matters:

   - `ignoreCommand` in `vercel.json` saves build minutes by skipping unchanged projects
   - PR preview control prevents duplicate deployments and keeps URLs consistent
   - Each project can deploy independently but share the same Vercel team

   How to validate:

   - Verify PR deployments only trigger with `deploy-preview` label
   - Check build logs show skipped builds for unchanged projects
   - Test that deploy hooks correctly trigger studio builds

2. **Code Organization**

   Why this matters:

   - File locations follow Astro's file-based routing conventions
   - API routes are discoverable and match their URL paths
   - Schemas stay grouped with their CMS configuration

   How to validate:

   - URLs should match file paths under `pages/`
   - Components should be properly imported and tree-shaken
   - Schemas should sync with Sanity on deploy

3. **Analytics**

   Why this matters:

   - Speed Insights tracks Core Web Vitals for real users
   - Production-only analytics prevent dev data contamination
   - All tracking respects user privacy preferences

   How to validate:

   - Check analytics only load in production builds
   - Verify metrics appear in Vercel dashboard
   - Test that dev builds have no tracking code

## Common Tasks

### Adding Content Types

1. Define schema in `studio/schemas/`
2. Add to `studio/schemaTypes/index.ts`
3. Create corresponding GROQ query in `site/src/lib/queries.ts`
4. Add type definition if needed

### Modifying Auth Flow

1. API routes in `site/src/pages/api/auth/`
2. Configuration in `site/src/lib/auth/config.ts`
3. Session management via `site/src/lib/auth/store.ts`

### Environment Variables

- **Site**:

  - `PUBLIC_ORIGIN`: Production URL
  - `PUBLIC_SANITY_*`: Sanity configuration
  - Review `.env.example` files for complete list

- **Studio**:
  - `STUDIO_DEPLOY_HOOK_URL`: Vercel deploy hook URL for CI/CD

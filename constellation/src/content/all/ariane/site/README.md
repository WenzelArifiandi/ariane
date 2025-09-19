# Ariane — Site

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Auth modes

Configure `AUTH_MODE` in `.env` (or your Vercel env) to control in-app authentication:

- `public` (default): No in-app auth; site is publicly viewable
- `app`: Require in-app GitHub OAuth session
- `cf-access-only`: Trust Cloudflare Access at the edge and skip in-app auth

The middleware trusts Cloudflare Access headers and builds absolute redirects for proxy/tunnel scenarios.

## Icons: local vs Google Fonts

By default, Material Symbols are loaded from Google Fonts. To use a local font instead:

1. Place `material-symbols-rounded.woff2` at `public/fonts/material-symbols-rounded.woff2`.
2. Set `PUBLIC_USE_LOCAL_ICONS=true` in your `.env`.

When local icons are enabled, the font is preloaded and revealed instantly to avoid flashes.

## Optional Rust/WASM acceleration

The session signer (`src/lib/auth/signer.ts`) can optionally leverage a Rust → WebAssembly implementation for HMAC-SHA256.

Build (requires Rust + `wasm-pack`):

```bash
cd site
npm run wasm:build:signer
```

Rebuild from scratch:

```bash
npm run wasm:rebuild:signer
```

Preload in application code (optional):

```ts
import { preloadSignerWasm } from "./src/lib/auth/signer";
await preloadSignerWasm(); // boolean — true if WASM available
```

If the WASM bundle is missing or fails to init, the original Node `crypto` implementation is used transparently. This pattern is a template for future CPU-heavy modules (e.g., CBOR parsing or image hashing).

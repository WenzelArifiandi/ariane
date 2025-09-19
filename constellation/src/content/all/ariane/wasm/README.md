# WASM Modules

This directory contains Rust -> WebAssembly crates that provide optional high-performance implementations of certain hot paths in the site.

## session-signer

Reimplements the HMAC-SHA256 signing used for session/state cookies (`site/src/lib/auth/signer.ts`).

### Build

Requires Rust and `wasm-pack`.

```bash
cargo install wasm-pack --locked # if not already installed
cd wasm/session-signer
wasm-pack build --target web --release --out-dir ../../site/src/lib/wasm/session-signer
```

The output will produce `pkg`-like artifacts directly in `site/src/lib/wasm/session-signer` (we override the dir). We only need `session_signer.js` and `session_signer_bg.wasm` (names may vary; adapt import path accordingly).

### Integration

`signer.ts` dynamically tries to load the WASM build at runtime (Edge/Node). If it fails or isnt built, it transparently falls back to the pure TypeScript implementation.

### Rationale

While HMAC-SHA256 is already native via Node's `crypto`, the WASM version allows experimenting with bundling strategies for possible future CPU-heavy modules (e.g., WebAuthn CBOR parsing, image hashing, etc.).

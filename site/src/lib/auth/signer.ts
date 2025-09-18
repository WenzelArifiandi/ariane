import { createHmac, timingSafeEqual } from "crypto";

// Optional WASM acceleration (loaded lazily). Build via: `npm --prefix site run wasm:build:signer`.
// Output expected at: site/src/lib/wasm/session-signer/*.wasm & JS glue.
// We avoid a static import so normal dev flow works without Rust toolchain.
let wasmReady: Promise<void> | null = null;
let wasm:
  | undefined
  | {
      sign: (value: string, secret: string) => string;
      verify: (signed: string, secret: string) => string | undefined | null;
    };

async function loadWasm(): Promise<void> {
  if (wasm || wasmReady) return wasmReady ?? Promise.resolve();
  wasmReady = (async () => {
    try {
      // Use dynamic import with string concatenation to prevent bundlers from resolving at build time
      // This makes the import truly optional - if the file doesn't exist, it fails gracefully
      const wasmPath = "../wasm/session-signer/" + "session_signer.js";
      const mod = await import(/* @vite-ignore */ wasmPath);
      if (typeof mod.default === "function") {
        // Some wasm-pack targets export a default init function requiring the wasm URL.
        // Try to locate the .wasm next to the JS file.
        const wasmUrl = new URL(
          "../wasm/session-signer/session_signer_bg.wasm",
          import.meta.url,
        );
        await mod.default(wasmUrl);
      }
      if (mod.sign && mod.verify) {
        wasm = { sign: mod.sign, verify: mod.verify };
      }
    } catch (err) {
      // Silently ignore; fallback will be used.
      // console.warn('WASM signer unavailable, using JS implementation:', err);
    }
  })();
  return wasmReady;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlToBuf(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

// Synchronous fallback implementation (original JS)
function signFallback(value: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(value).digest();
  return `${b64url(Buffer.from(value))}.${b64url(sig)}`;
}
function verifyFallback(signed: string, secret: string): string | null {
  const [valB64, sigB64] = signed.split(".");
  if (!valB64 || !sigB64) return null;
  const valueBuf = b64urlToBuf(valB64);
  const expected = createHmac("sha256", secret).update(valueBuf).digest();
  const got = b64urlToBuf(sigB64);
  if (expected.length !== got.length) return null;
  if (!timingSafeEqual(expected, got)) return null;
  return valueBuf.toString();
}

// Public API (maintain synchronous shape) — attempts WASM only if already loaded.
// Expose an async preload for callers who want to ensure WASM path.
export async function preloadSignerWasm(): Promise<boolean> {
  await loadWasm();
  return !!wasm;
}

export function sign(value: string, secret: string): string {
  if ((wasm as any)?.sign) {
    try {
      return (wasm as any).sign(value, secret);
    } catch {}
  }
  return signFallback(value, secret);
}

export function verify(signed: string, secret: string): string | null {
  if ((wasm as any)?.verify) {
    try {
      return (wasm as any).verify(signed, secret) ?? null;
    } catch {}
  }
  return verifyFallback(signed, secret);
}

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
  maxAge?: number; // seconds
};

export function makeCookie(
  name: string,
  value: string,
  opts: CookieOptions = {},
): string {
  const parts = [`${name}=${value}`];
  if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Strict"}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  return parts.join("; ");
}

export function clearCookie(name: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=`];
  parts.push("Max-Age=0");
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Strict"}`);
  parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  return parts.join("; ");
}

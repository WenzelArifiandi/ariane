// Type stub for optional WASM signer (generated via wasm-pack).
// This allows TypeScript to compile even when the WASM build output isn't present.
// The actual generated JS file path: ../wasm/session-signer/session_signer.js
// Adjust if wasm-pack naming changes.
export function sign(value: string, secret: string): string;
export function verify(
  signed: string,
  secret: string,
): string | undefined | null;
const init: (input?: RequestInfo | URL) => Promise<any>;
export default init;

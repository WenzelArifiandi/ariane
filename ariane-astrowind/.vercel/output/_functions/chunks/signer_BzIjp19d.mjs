import { createHmac, timingSafeEqual } from 'node:crypto';

function getEnv(key, fallback) {
  const val = process.env[key];
  if (val && val.length > 0) return val;
  return fallback;
}
function getRpIdFromOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return "localhost";
  }
}
function getOriginFromRequest(req) {
  const fromEnv = process.env.PUBLIC_ORIGIN;
  if (fromEnv) return fromEnv;
  const proto = (req.headers.get("x-forwarded-proto") || req.headers.get("x-proto")) ?? "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:4321";
  return `${proto}://${host}`;
}
function isProd() {
  return process.env.NODE_ENV === "production";
}

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlToBuf(input) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - input.length % 4);
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}
function sign(value, secret) {
  const sig = createHmac("sha256", secret).update(value).digest();
  return `${b64url(Buffer.from(value))}.${b64url(sig)}`;
}
function verify(signed, secret) {
  const [valB64, sigB64] = signed.split(".");
  if (!valB64 || !sigB64) return null;
  const valueBuf = b64urlToBuf(valB64);
  const expected = createHmac("sha256", secret).update(valueBuf).digest();
  const got = b64urlToBuf(sigB64);
  if (expected.length !== got.length) return null;
  if (!timingSafeEqual(expected, got)) return null;
  return valueBuf.toString();
}
function makeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Strict"}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  return parts.join("; ");
}
function clearCookie(name, opts = {}) {
  const parts = [`${name}=`];
  parts.push("Max-Age=0");
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Strict"}`);
  parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  return parts.join("; ");
}

export { getRpIdFromOrigin as a, getEnv as b, clearCookie as c, getOriginFromRequest as g, isProd as i, makeCookie as m, sign as s, verify as v };

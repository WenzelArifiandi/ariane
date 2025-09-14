import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlToBuf(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

export function sign(value: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(value).digest();
  return `${b64url(Buffer.from(value))}.${b64url(sig)}`;
}

export function verify(signed: string, secret: string): string | null {
  const [valB64, sigB64] = signed.split('.');
  if (!valB64 || !sigB64) return null;
  const valueBuf = b64urlToBuf(valB64);
  const expected = createHmac('sha256', secret).update(valueBuf).digest();
  const got = b64urlToBuf(sigB64);
  if (expected.length !== got.length) return null;
  if (!timingSafeEqual(expected, got)) return null;
  return valueBuf.toString();
}

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  maxAge?: number; // seconds
};

export function makeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  parts.push(`Path=${opts.path ?? '/'}`);
  parts.push(`SameSite=${opts.sameSite ?? 'Strict'}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=`];
  parts.push('Max-Age=0');
  parts.push(`Path=${opts.path ?? '/'}`);
  parts.push(`SameSite=${opts.sameSite ?? 'Strict'}`);
  parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

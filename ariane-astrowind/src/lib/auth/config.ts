export function getEnv(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val && val.length > 0) return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env var: ${key}`);
}

export function getRpIdFromOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return 'localhost';
  }
}

export function getOriginFromRequest(req: Request): string {
  const fromEnv = process.env.PUBLIC_ORIGIN;
  if (fromEnv) return fromEnv;
  const proto = (req.headers.get('x-forwarded-proto') || req.headers.get('x-proto')) ?? 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:4321';
  return `${proto}://${host}`;
}

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

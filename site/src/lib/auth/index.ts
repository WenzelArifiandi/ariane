import { getEnv } from "./config";
import { verify } from "./signer";

export type SessionAuthResult = {
  isAuthenticated: boolean;
  user: { id: string } | null;
};

export type SessionPayload = {
  sub: string; // subject (e.g., provider:userId)
  iat?: number; // issued at (ms since epoch)
  exp?: number; // expiry (ms since epoch)
  [key: string]: unknown;
};

function parseCookie(
  header: string | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(/;\s*/).forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) out[k] = v;
    }
  });
  return out;
}

export async function checkSessionAuth(
  request: Request,
): Promise<SessionAuthResult> {
  const cookies = parseCookie(request.headers.get("cookie"));
  const session = cookies["session"];
  if (!session) return { isAuthenticated: false, user: null };

  const secret = getEnv("SESSION_SECRET", "dev-only");
  const value = verify(session, secret);
  if (!value) return { isAuthenticated: false, user: null };

  // Parse and validate the signed session payload
  let payload: SessionPayload | null = null;
  try {
    const obj = JSON.parse(value);
    // Basic shape checks
    if (obj && typeof obj.sub === "string") {
      payload = obj as SessionPayload;
    }
  } catch {
    // Non-JSON payloads are not accepted for authentication
    return { isAuthenticated: false, user: null };
  }
  if (!payload) return { isAuthenticated: false, user: null };

  // Expiration check (if present)
  if (typeof payload.exp === "number" && Date.now() > payload.exp) {
    return { isAuthenticated: false, user: null };
  }

  return { isAuthenticated: true, user: { id: payload.sub } };
}

export * from "./signer";
export * from "./config";

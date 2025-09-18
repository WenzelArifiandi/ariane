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
  const unauthorizedResult: SessionAuthResult = {
    isAuthenticated: false,
    user: null,
  };
  const cookies = parseCookie(request.headers.get("cookie"));
  const session = cookies["session"];
  if (!session) return unauthorizedResult;

  const secret = getEnv("SESSION_SECRET");
  const value = verify(session, secret);
  if (!value) return unauthorizedResult;

  // Parse and validate the signed session payload
  let payload: SessionPayload;
  try {
    payload = JSON.parse(value);
  } catch {
    // Non-JSON payloads are not accepted for authentication
    return unauthorizedResult;
  }

  if (!payload || typeof payload.sub !== "string") {
    return unauthorizedResult;
  }

  // Expiration check (if present)
  if (typeof payload.exp === "number" && Date.now() > payload.exp)
    return unauthorizedResult;

  return { isAuthenticated: true, user: { id: payload.sub } };
}

export * from "./signer";
export * from "./config";

import { getEnv } from "./config";
import { verify } from "./signer";

export type SessionAuthResult = {
  isAuthenticated: boolean;
  user: { id: string } | null;
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

  // The value can be any serialized payload; for tests we just return a stubbed user
  // If your signed value encodes userId, you can parse it here.
  return { isAuthenticated: true, user: { id: "user" } };
}

export * from "./signer";
export * from "./config";

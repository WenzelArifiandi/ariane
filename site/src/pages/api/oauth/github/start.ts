const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
import type { APIRoute } from "astro";
import { sign } from "../../../../lib/auth/signer";
import { getEnv } from "../../../../lib/auth/config";
import { createHmac, createHash } from "node:crypto";

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function codeVerifierFrom(secret: string, csrf: string, iat: number): string {
  const h = createHmac("sha256", secret).update(`${csrf}.${iat}`).digest();
  return b64url(h);
}

function codeChallengeFor(verifier: string): string {
  const d = createHash("sha256").update(verifier).digest();
  return b64url(d);
}

export const GET: APIRoute = async ({ url }) => {
  const clientId =
    (import.meta as any).env?.GITHUB_OAUTH_CLIENT_ID ??
    process.env.GITHUB_OAUTH_CLIENT_ID;
  // Support single or multiple callbacks via env; if none provided, omit redirect_uri so GitHub uses the registered default
  const callbacksRaw =
    (import.meta as any).env?.GITHUB_OAUTH_CALLBACK_URLS ??
    process.env.GITHUB_OAUTH_CALLBACK_URLS;
  const singleCallback =
    (import.meta as any).env?.GITHUB_OAUTH_CALLBACK_URL ??
    process.env.GITHUB_OAUTH_CALLBACK_URL;
  const callbacks = (callbacksRaw || singleCallback || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const callback = callbacks[0];
  const allowedOrg =
    (import.meta as any).env?.GITHUB_ALLOWED_ORG ??
    process.env.GITHUB_ALLOWED_ORG;

  if (!clientId) {
    return new Response(
      "GitHub OAuth not configured. Set GITHUB_OAUTH_CLIENT_ID in .env",
      { status: 500 },
    );
  }

  // Generate CSRF state and encode redirect in the state param
  const csrf = crypto.randomUUID();
  const redirectParam = url.searchParams.get("redirect");
  let redirect = "/";
  if (
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//")
  ) {
    redirect = redirectParam;
  }
  // Create signed, expiring state
  const now = Date.now();
  const exp = now + 10 * 60 * 1000; // 10 minutes
  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const statePayload = JSON.stringify({ csrf, iat: now, exp, redirect });
  const state = sign(statePayload, secret);

  // PKCE without storage
  const code_verifier = codeVerifierFrom(secret, csrf, now);
  const code_challenge = codeChallengeFor(code_verifier);

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  if (callback) params.set("redirect_uri", callback);
  params.set(
    "scope",
    ["read:user", "user:email", allowedOrg ? "read:org" : undefined]
      .filter(Boolean)
      .join(" "),
  );
  params.set("state", state);
  params.set("code_challenge_method", "S256");
  params.set("code_challenge", code_challenge);

  const redirectTo = `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo },
  });
};

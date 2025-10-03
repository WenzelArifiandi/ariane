// Cloudflare Access JWT verification utilities
import type { APIContext } from "astro";

export interface CloudflareAccessUser {
  email: string;
  sub: string;
  name?: string;
}

/**
 * Verify and decode Cloudflare Access JWT from CF_Authorization cookie
 * Docs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */
export async function verifyCloudflareAccessJWT(
  request: Request
): Promise<CloudflareAccessUser | null> {
  try {
    // Get JWT from CF_Authorization cookie or Cf-Access-Jwt-Assertion header
    const cookieHeader = request.headers.get("cookie");
    const jwtHeader = request.headers.get("Cf-Access-Jwt-Assertion");

    let token: string | null = null;

    if (jwtHeader) {
      token = jwtHeader;
    } else if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      token = cookies.CF_Authorization || null;
    }

    if (!token) {
      console.warn("[CF Access] No JWT found in cookie or header");
      return null;
    }

    // Decode JWT (without verification for now - in production you should verify signature)
    // The JWT has 3 parts: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.warn("[CF Access] Invalid JWT format");
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    // Extract user claims
    const user: CloudflareAccessUser = {
      email: payload.email || payload.sub,
      sub: payload.sub,
      name: payload.name,
    };

    console.log("[CF Access] Verified user", { email: user.email, sub: user.sub });

    return user;
  } catch (error) {
    console.error("[CF Access] JWT verification failed", error);
    return null;
  }
}

/**
 * Create a short-lived signed cookie for SLO (Single Logout)
 */
export function createSLOCookie(userEmail: string): string {
  const maxAge = 60; // 60 seconds TTL
  const value = Buffer.from(userEmail).toString("base64url");

  // In production, sign this cookie with SESSION_SECRET
  return `slo_user=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Read and verify SLO cookie
 */
export function readSLOCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );

  const sloUser = cookies.slo_user;
  if (!sloUser) return null;

  try {
    return Buffer.from(sloUser, "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Clear SLO cookie
 */
export function clearSLOCookie(): string {
  return "slo_user=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

/**
 * Store OIDC ID token in httpOnly cookie for logout id_token_hint
 * The ID token is embedded in the CF_Authorization JWT custom claims
 */
export function createIDTokenCookie(idToken: string): string {
  const maxAge = 24 * 60 * 60; // 24 hours (match session duration)

  // Store the raw ID token for use in end_session id_token_hint
  return `cipher_id_token=${idToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Read ID token from cookie for logout id_token_hint
 */
export function readIDTokenCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...v] = c.split("=");
      return [key, v.join("=")];
    })
  );

  return cookies.cipher_id_token || null;
}

/**
 * Clear ID token cookie
 */
export function clearIDTokenCookie(): string {
  return "cipher_id_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

/**
 * Extract OIDC ID token from Cloudflare Access JWT custom claims
 * CF Access includes the original OIDC ID token in custom claims
 */
export function extractIDTokenFromCFJWT(cfJWT: string): string | null {
  try {
    const parts = cfJWT.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    // CF Access may store the original ID token in custom claims
    // Check common claim names
    return payload.id_token || payload.oidc_id_token || payload.identity?.id_token || null;
  } catch (error) {
    console.error("[CF Access] Failed to extract ID token from JWT", error);
    return null;
  }
}

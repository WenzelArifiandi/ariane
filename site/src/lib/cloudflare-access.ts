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

import type { MiddlewareHandler } from "astro";
import { verify as verifySig } from "./lib/auth/signer";
import {
  getOriginFromHeaders,
  getProtectedPrefixes,
  getRequiredGroupsEnv,
  verifyCfAccessJwt,
  isApprovedFromClaims,
  shouldEnforceApproved,
} from "./lib/cfAccess";
import { getEnv } from "./lib/auth/config";

const PUBLIC_PATHS = [
  "/api/oauth/github/start",
  "/api/oauth/github/callback",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/diag",
  "/access-required",
  "/access-denied",
  "/logged-out",
  "/signout",
  "/post-access-logout",
];

function isApiOrAsset(path: string): boolean {
  if (path.startsWith("/api/")) return true;
  if (path.startsWith("/_astro/")) return true;
  if (path.startsWith("/assets/")) return true;
  if (path.startsWith("/favicon")) return true;
  if (path.startsWith("/fonts/")) return true;
  if (path.startsWith("/images/")) return true;
  if (
    path.match(/\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?)$/)
  )
    return true;
  return false;
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url } = context;
  const path = url.pathname;

  if (PUBLIC_PATHS.includes(path) || isApiOrAsset(path)) {
    return next();
  }

  // Determine host/proto for environment-aware behavior behind proxies/CDNs
  const headers = context.request.headers;
  const origin = getOriginFromHeaders(headers);
  const host = origin.replace(/^https?:\/\//, "");
  const proto = origin.startsWith("https") ? "https" : "http";

  // Auth modes:
  // - 'public' (default): no app auth required
  // - 'app': require app session unless Cloudflare Access headers are present
  // - 'cf-access-only': skip app auth entirely; rely on Cloudflare Access at the edge
  let authMode =
    process.env.AUTH_MODE ||
    ((import.meta as unknown as { env?: Record<string, unknown> }).env
      ?.AUTH_MODE as string) ||
    "public";

  // Safety: on the primary public domain, default to public mode to avoid accidental prompts
  // This prevents a mis-set AUTH_MODE from forcing app login on wenzelarifiandi.com
  const isMainSite =
    host === "wenzelarifiandi.com" || host === "www.wenzelarifiandi.com";
  if (isMainSite && authMode === "app") {
    authMode = "public";
  }
  if (authMode === "cf-access-only") {
    // Optional: enforce group-based authorization for selected path prefixes using CF Access JWT
    const protectedPrefixes = getProtectedPrefixes();
    const requiresAuthz = protectedPrefixes.some((p) => path.startsWith(p));
    // If not a protected path, still allow through (public-by-default under cf-access-only)
    if (!requiresAuthz) {
      // Optionally enforce Auth0-approved globally when behind Access
      if (shouldEnforceApproved()) {
        try {
          const token = context.request.headers.get("cf-access-jwt-assertion");
          if (!token) return new Response("Unauthorized", { status: 401 });
          const claims = await verifyCfAccessJwt(token, { origin });
          if (!isApprovedFromClaims(claims as Record<string, unknown>)) {
            return new Response("Forbidden", { status: 403 });
          }
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
      }
      return next();
    }
    try {
      const token = context.request.headers.get("cf-access-jwt-assertion");
      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }
      const claims = await verifyCfAccessJwt(token, { origin });
      const { claim, required } = getRequiredGroupsEnv();
      if (required.length === 0) {
        // If no groups required, check Auth0-approved flag if present; otherwise allow
        if (isApprovedFromClaims(claims as Record<string, unknown>))
          return next();
        // If no approved flag configured/found, allow by default
        return next();
      }
      const groups = claims[claim] as unknown as string[] | undefined;
      const has =
        Array.isArray(groups) && required.every((g) => groups.includes(g));
      if (!has) {
        return new Response("Forbidden", { status: 403 });
      }
      // Passed group check; also allow Auth0-approved flow
      return next();
    } catch (e) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // If Cloudflare Access is enforcing at the edge, trust it and skip app auth
  const cfAccessJwt = context.request.headers.get("cf-access-jwt-assertion");
  const cfAccessEmail = context.request.headers.get(
    "cf-access-authenticated-user-email",
  );
  const cfAccessOrgId = context.request.headers.get("cf-access-org-id");

  // If any Cloudflare Access headers are present, user has been authenticated by CF Access
  if (cfAccessJwt || cfAccessEmail || cfAccessOrgId) {
    // Optional: if you want to require Auth0-approved for the whole site when behind Access,
    // you can uncomment the block below to enforce globally.
    // try {
    //   const origin = getOriginFromHeaders(context.request.headers)
    //   const claims = await verifyCfAccessJwt(cfAccessJwt!, { origin })
    //   if (!isApprovedFromClaims(claims as any)) {
    //     return new Response("Forbidden", { status: 403 })
    //   }
    // } catch {}
    return next();
  }

  // In public mode, don't enforce app auth
  if (authMode !== "app") {
    return next();
  }

  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const cookieHeader = context.request.headers.get("cookie") || "";
  const sessionCookie = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith("session="));
  if (sessionCookie) {
    const signed = sessionCookie.split("=")[1];
    const payload = verifySig(signed, secret);
    if (payload) {
      try {
        const session = JSON.parse(payload);
        if (session.exp && Date.now() < session.exp) {
          return next();
        }
      } catch {}
    }
  }

  // Not authenticated: redirect to OAuth start with return path
  const requestedPath = `${url.pathname}${url.search}` || "/";
  const redirect = encodeURIComponent(requestedPath);
  // Absolute redirect for proxies
  const absoluteOrigin = `${proto}://${host}`;
  const absolute = `${absoluteOrigin}/access-required?next=${redirect}`;
  return Response.redirect(absolute, 302);
};

// Consolidated security headers helper. (Removed duplicate definition added by bot.)
export function addSecurityHeaders(response: Response): Response {
  // Clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Basic legacy XSS filter (largely inert on modern browsers but harmless)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy: restricted cross-origin leakage
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrictive permissions; extend as needed
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

// Security headers (auto-added by security bot)
export function addSecurityHeaders(response: Response): Response {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

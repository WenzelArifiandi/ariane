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

interface RequestContext {
  url: URL;
  path: string;
  headers: Headers;
  origin: string;
  host: string;
  proto: string;
}

interface AuthResult {
  authenticated: boolean;
  response?: Response;
}

function getRequestContext(context: unknown): RequestContext {
  const { url } = context;
  const path = url.pathname;
  const headers = context.request.headers;
  const origin = getOriginFromHeaders(headers);
  const host = origin.replace(/^https?:\/\//, "");
  const proto = origin.startsWith("https") ? "https" : "http";

  return { url, path, headers, origin, host, proto };
}

function determineAuthMode(host: string): string {
  let authMode =
    process.env.AUTH_MODE ||
    ((import.meta as unknown as { env?: Record<string, unknown> }).env
      ?.AUTH_MODE as string) ||
    "public";

  // Safety: on the primary public domain, default to public mode to avoid accidental prompts
  const isMainSite =
    host === "wenzelarifiandi.com" || host === "www.wenzelarifiandi.com";
  if (isMainSite && authMode === "app") {
    authMode = "public";
  }

  return authMode;
}

async function handleCloudflareAccessOnlyMode(
  requestContext: RequestContext,
): Promise<AuthResult> {
  const { path, headers, origin } = requestContext;

  const protectedPrefixes = getProtectedPrefixes();
  const requiresAuthz = protectedPrefixes.some((p) => path.startsWith(p));

  // If not a protected path, still allow through (public-by-default under cf-access-only)
  if (!requiresAuthz) {
    // Optionally enforce Auth0-approved globally when behind Access
    if (shouldEnforceApproved()) {
      try {
        const token = headers.get("cf-access-jwt-assertion");
        if (!token) {
          return {
            authenticated: false,
            response: addSecurityHeaders(
              new Response("Unauthorized", { status: 401 }),
            ),
          };
        }
        const claims = await verifyCfAccessJwt(token, { origin });
        if (!isApprovedFromClaims(claims as Record<string, unknown>)) {
          return {
            authenticated: false,
            response: addSecurityHeaders(
              new Response("Forbidden", { status: 403 }),
            ),
          };
        }
      } catch {
        return {
          authenticated: false,
          response: addSecurityHeaders(
            new Response("Unauthorized", { status: 401 }),
          ),
        };
      }
    }
    return { authenticated: true };
  }

  try {
    const token = headers.get("cf-access-jwt-assertion");
    if (!token) {
      return {
        authenticated: false,
        response: new Response("Unauthorized", { status: 401 }),
      };
    }

    const claims = await verifyCfAccessJwt(token, { origin });
    const { claim, required } = getRequiredGroupsEnv();

    if (required.length === 0) {
      // If no groups required, check Auth0-approved flag if present; otherwise allow
      if (isApprovedFromClaims(claims as Record<string, unknown>)) {
        return { authenticated: true };
      }
      // If no approved flag configured/found, allow by default
      return { authenticated: true };
    }

    const groups = claims[claim] as unknown as string[] | undefined;
    const hasRequiredGroups =
      Array.isArray(groups) && required.every((g) => groups.includes(g));

    if (!hasRequiredGroups) {
      return {
        authenticated: false,
        response: new Response("Forbidden", { status: 403 }),
      };
    }

    return { authenticated: true };
  } catch (e) {
    return {
      authenticated: false,
      response: new Response("Unauthorized", { status: 401 }),
    };
  }
}

function checkCloudflareAccessHeaders(headers: Headers): boolean {
  const cfAccessJwt = headers.get("cf-access-jwt-assertion");
  const cfAccessEmail = headers.get("cf-access-authenticated-user-email");
  const cfAccessOrgId = headers.get("cf-access-org-id");

  return !!(cfAccessJwt || cfAccessEmail || cfAccessOrgId);
}

function checkSessionAuth(headers: Headers): boolean {
  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const cookieHeader = headers.get("cookie") || "";
  const sessionCookie = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith("session="));

  if (!sessionCookie) return false;

  const signed = sessionCookie.split("=")[1];
  const payload = verifySig(signed, secret);

  if (!payload) return false;

  try {
    const session = JSON.parse(payload);
    return session.exp && Date.now() < session.exp;
  } catch {
    return false;
  }
}

function createAccessRequiredRedirect(
  requestContext: RequestContext,
): Response {
  const { url, proto, host } = requestContext;
  const requestedPath = `${url.pathname}${url.search}` || "/";
  const redirect = encodeURIComponent(requestedPath);
  const absoluteOrigin = `${proto}://${host}`;
  const absolute = `${absoluteOrigin}/access-required?next=${redirect}`;
  const response = Response.redirect(absolute, 302);
  return addSecurityHeaders(response);
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const requestContext = getRequestContext(context);
  const { path } = requestContext;

  // Handle public paths and assets
  if (PUBLIC_PATHS.includes(path) || isApiOrAsset(path)) {
    const response = await next();
    return addSecurityHeaders(response);
  }

  const authMode = determineAuthMode(requestContext.host);

  // Handle Cloudflare Access only mode
  if (authMode === "cf-access-only") {
    const authResult = await handleCloudflareAccessOnlyMode(requestContext);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const response = await next();
    return addSecurityHeaders(response);
  }

  // Check for Cloudflare Access headers
  if (checkCloudflareAccessHeaders(requestContext.headers)) {
    const response = await next();
    return addSecurityHeaders(response);
  }

  // In public mode, don't enforce app auth
  if (authMode !== "app") {
    const response = await next();
    return addSecurityHeaders(response);
  }

  // Check session authentication
  if (checkSessionAuth(requestContext.headers)) {
    const response = await next();
    return addSecurityHeaders(response);
  }

  // Not authenticated: redirect to access required
  return createAccessRequiredRedirect(requestContext);
};

// Consolidated security headers helper. (Removed duplicate definition added by bot.)
export function addSecurityHeaders(response: Response): Response {
  // Clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Basic legacy XSS filter (largely inert on modern browsers but harmless)
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy: restricted cross-origin leakage
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrictive permissions; extend as needed
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

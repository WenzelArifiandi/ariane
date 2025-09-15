import type { MiddlewareHandler } from "astro";
import { verify as verifySig } from "./lib/auth/signer";
import { getEnv } from "./lib/auth/config";

const PUBLIC_PATHS = [
  "/api/oauth/github/start",
  "/api/oauth/github/callback",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/diag",
  "/access-required",
  "/access-denied",
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

  // Check if we're running behind Cloudflare Access and should skip app auth entirely
  const authMode = process.env.AUTH_MODE || (import.meta as any).env?.AUTH_MODE;
  if (authMode === "cf-access-only") {
    console.log("[Middleware] AUTH_MODE=cf-access-only, skipping all app auth");
    return next();
  }

  // If Cloudflare Access is enforcing at the edge, trust it and skip app auth
  const cfAccessJwt = context.request.headers.get("cf-access-jwt-assertion");
  const cfAccessEmail = context.request.headers.get(
    "cf-access-authenticated-user-email",
  );
  const cfAccessOrgId = context.request.headers.get("cf-access-org-id");

  // If any Cloudflare Access headers are present, user has been authenticated by CF Access
  if (cfAccessJwt || cfAccessEmail || cfAccessOrgId) {
    console.log(
      "[Middleware] Cloudflare Access authenticated user, skipping app auth",
    );
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
  const headers = context.request.headers;
  const host =
    headers.get("x-forwarded-host") || headers.get("host") || "127.0.0.1:4321";
  const proto =
    headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin = `${proto}://${host}`;
  const absolute = `${origin}/access-required?next=${redirect}`;
  return Response.redirect(absolute, 302);
};

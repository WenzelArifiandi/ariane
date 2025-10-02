import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const headers = request.headers;
  const host =
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    url.host ||
    "wenzelarifiandi.com";
  const proto =
    headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const nextPath = url.searchParams.get("next") || "/";
  let returnTo: string;

  try {
    const resolved = new URL(nextPath, origin);
    returnTo = resolved.toString();
  } catch (error) {
    console.warn("[/signout] Invalid next parameter, defaulting to origin", {
      nextPath,
      error,
    });
    returnTo = origin;
  }

  const teamDomain =
    (import.meta as any)?.env?.CF_TEAM_DOMAIN ||
    process.env.CF_TEAM_DOMAIN ||
    "wenzelarifiandi.cloudflareaccess.com";

  // Cloudflare Access only clears its own session.
  // For full logout (including Cipher/ZITADEL), we'd need:
  // 1. post_logout_redirect_uri registered in ZITADEL application config
  // 2. client_id passed to ZITADEL logout endpoint
  //
  // Since we don't have that configured, just do Cloudflare Access logout.
  // User can manually visit https://cipher.wenzelarifiandi.com to logout from Cipher.

  const cfAccessLogoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(returnTo)}`;

  console.log("[/signout] Cloudflare Access logout", {
    referer: request.headers.get("referer"),
    logoutUrl: cfAccessLogoutUrl,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: cfAccessLogoutUrl },
  });
};

export const prerender = false;

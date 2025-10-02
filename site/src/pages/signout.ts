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

  // Full logout chain: Cipher OIDC → Cloudflare Access → Home
  // Requires:
  // 1. CIPHER_CLIENT_ID env var
  // 2. https://wenzelarifiandi.cloudflareaccess.com/cdn-cgi/access/logout
  //    registered in ZITADEL post-logout redirect URIs

  // ZITADEL has a bug (Issue #10413) where the UI uses 'post_logout_redirect'
  // instead of 'post_logout_redirect_uri', causing users to get stuck on account picker.
  //
  // Workaround: Clear Cloudflare Access, then let page JS handle Cipher logout via iframe
  // This avoids user-visible redirects through ZITADEL's buggy UI.

  const cfAccessLogoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(returnTo)}`;

  console.log("[/signout] Cloudflare Access logout", {
    referer: request.headers.get("referer"),
    logoutUrl: cfAccessLogoutUrl,
    note: "Cipher logout handled client-side to avoid ZITADEL UI bug",
  });

  return new Response(null, {
    status: 302,
    headers: { Location: cfAccessLogoutUrl },
  });
};

export const prerender = false;

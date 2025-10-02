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

  // Step 1: Build Cipher/ZITADEL logout URL
  // This will log out from the OIDC provider session
  const cipherIssuer = "https://cipher.wenzelarifiandi.com";
  const teamDomain =
    (import.meta as any)?.env?.CF_TEAM_DOMAIN ||
    process.env.CF_TEAM_DOMAIN ||
    "wenzelarifiandi.cloudflareaccess.com";

  // Cloudflare Access logout URL (where Cipher will redirect back to)
  const cfAccessLogoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(returnTo)}`;

  // Cipher OIDC end_session_endpoint
  // After logging out from Cipher, it will redirect to the Cloudflare Access logout
  const cipherLogoutUrl = `${cipherIssuer}/oidc/v1/end_session?post_logout_redirect_uri=${encodeURIComponent(cfAccessLogoutUrl)}`;

  console.log("[/signout] Full logout chain", {
    referer: request.headers.get("referer"),
    step1_cipher: cipherLogoutUrl,
    step2_cloudflare: cfAccessLogoutUrl,
    step3_final: returnTo,
  });

  // Redirect to Cipher logout first, which will chain to Cloudflare Access logout
  return new Response(null, {
    status: 302,
    headers: { Location: cipherLogoutUrl },
  });
};

export const prerender = false;

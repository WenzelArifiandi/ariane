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

  const cipherClientId =
    import.meta.env.CIPHER_CLIENT_ID ||
    process.env.CIPHER_CLIENT_ID;

  if (cipherClientId) {
    const cipherIssuer = "https://cipher.wenzelarifiandi.com";

    // Final destination after full logout chain
    const finalReturnUrl = new URL(returnTo);
    finalReturnUrl.searchParams.set("logged_out", "true");

    // Step 2: Cloudflare Access logout (where Cipher redirects to)
    const cfAccessLogoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(finalReturnUrl.toString())}`;

    // Step 1: Cipher/ZITADEL logout (starts the chain)
    const cipherLogoutUrl = `${cipherIssuer}/oidc/v1/end_session?client_id=${encodeURIComponent(cipherClientId)}&post_logout_redirect_uri=${encodeURIComponent(cfAccessLogoutUrl)}`;

    console.log("[/signout] Full logout chain", {
      step1_cipher: cipherLogoutUrl,
      step2_cloudflare: cfAccessLogoutUrl,
      step3_final: finalReturnUrl.toString(),
    });

    return new Response(null, {
      status: 302,
      headers: { Location: cipherLogoutUrl },
    });
  }

  // Fallback: Cloudflare Access only
  const cfAccessLogoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(returnTo)}`;

  console.log("[/signout] Cloudflare Access logout only (no CIPHER_CLIENT_ID)", {
    referer: request.headers.get("referer"),
    logoutUrl: cfAccessLogoutUrl,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: cfAccessLogoutUrl },
  });
};

export const prerender = false;

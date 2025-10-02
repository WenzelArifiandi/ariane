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
  let finalRedirect: string;

  try {
    const resolved = new URL(nextPath, origin);
    finalRedirect = resolved.toString();
  } catch (error) {
    console.warn("[/signout] Invalid next parameter, defaulting to origin", {
      nextPath,
      error,
    });
    finalRedirect = origin;
  }

  const logoutCallback = new URL("/api/auth/logout", origin);
  logoutCallback.searchParams.set("redirect", finalRedirect);
  logoutCallback.searchParams.set("ts", Date.now().toString());

  const teamDomain =
    (import.meta as any)?.env?.CF_TEAM_DOMAIN ||
    process.env.CF_TEAM_DOMAIN ||
    "wenzelarifiandi.cloudflareaccess.com";

  const logoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(
    logoutCallback.toString(),
  )}`;

  console.log("[/signout] Redirecting to Cloudflare Access logout", {
    referer: request.headers.get("referer"),
    logoutUrl,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: logoutUrl },
  });
};

export const prerender = false;

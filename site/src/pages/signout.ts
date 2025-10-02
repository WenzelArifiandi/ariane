import type { APIRoute } from "astro";
import {
  verifyCloudflareAccessJWT,
  createSLOCookie,
} from "../lib/cloudflare-access";

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

  // Hybrid SLO: Extract user from CF_Authorization JWT before logout
  // This allows us to programmatically revoke ZITADEL sessions after Cloudflare logout
  const user = await verifyCloudflareAccessJWT(request);

  const responseHeaders = new Headers();

  if (user?.email) {
    // Store user email in short-lived signed cookie (60s TTL)
    // This will be used by client-side script to trigger ZITADEL session revocation
    responseHeaders.append("Set-Cookie", createSLOCookie(user.email));
    console.log("[/signout] Stored SLO cookie for user", user.email);
  }

  // Add slo=1 param to return URL so client knows to trigger ZITADEL logout
  const returnWithSLO = new URL(returnTo);
  returnWithSLO.searchParams.set("slo", "1");

  const cfAccessLogoutUrl = `https://${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(returnWithSLO.toString())}`;

  console.log("[/signout] Hybrid SLO logout", {
    referer: request.headers.get("referer"),
    logoutUrl: cfAccessLogoutUrl,
    userEmail: user?.email || "unknown",
  });

  responseHeaders.set("Location", cfAccessLogoutUrl);

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
};

export const prerender = false;

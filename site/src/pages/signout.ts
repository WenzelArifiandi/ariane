import type { APIRoute } from "astro";

function getOrigin(headers: Headers): string {
  const host =
    headers.get("x-forwarded-host") || headers.get("host") || "127.0.0.1:4321";
  const proto =
    headers.get("x-forwarded-proto") ||
    (host.includes("127.0.0.1") || host.includes("localhost")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

export const GET: APIRoute = async ({ request }) => {
  const origin = getOrigin(request.headers);

  // Since users authenticate through Cloudflare Access (not directly with Zitadel),
  // there's no Zitadel browser session to end. Users only have a Cloudflare Access session.
  // Redirect directly to Cloudflare Access logout to clear the Access cookie.
  const cfLogout = new URL("/cdn-cgi/access/logout", origin);

  return new Response(null, {
    status: 302,
    headers: { Location: cfLogout.toString() },
  });
};

export const prerender = false;

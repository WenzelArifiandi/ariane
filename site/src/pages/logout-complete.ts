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

  // Complete the logout by clearing Cloudflare Access session
  const cfLogout = new URL("/cdn-cgi/access/logout", origin);
  cfLogout.searchParams.set("returnTo", new URL("/", origin).toString());

  return new Response(null, {
    status: 302,
    headers: { Location: cfLogout.toString() },
  });
};

export const prerender = false;
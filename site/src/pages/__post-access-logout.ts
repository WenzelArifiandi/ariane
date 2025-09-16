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
  const AUTH0_DOMAIN =
    process.env.PUBLIC_AUTH0_DOMAIN ||
    (import.meta as any).env?.PUBLIC_AUTH0_DOMAIN;
  const AUTH0_CLIENT_ID =
    process.env.PUBLIC_AUTH0_CLIENT_ID ||
    (import.meta as any).env?.PUBLIC_AUTH0_CLIENT_ID;

  // If Auth0 configuration is available, hit its logout to clear IdP session.
  if (AUTH0_DOMAIN && AUTH0_CLIENT_ID) {
    const auth0Logout = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
    auth0Logout.searchParams.set("client_id", AUTH0_CLIENT_ID);
    // After IdP logout, go back to origin (root). Access will immediately require login and auto-redirect to Auth0.
    auth0Logout.searchParams.set("returnTo", new URL("/", origin).toString());
    return new Response(null, {
      status: 302,
      headers: { Location: auth0Logout.toString() },
    });
  }

  // If Auth0 envs are not set, just go back to origin; Access will prompt for login.
  return new Response(null, {
    status: 302,
    headers: { Location: new URL("/", origin).toString() },
  });
};

export const prerender = false;

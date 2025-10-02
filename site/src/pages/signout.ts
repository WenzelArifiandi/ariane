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
  // Auth0 (legacy)
  const AUTH0_DOMAIN =
    process.env.PUBLIC_AUTH0_DOMAIN ||
    (import.meta as any).env?.PUBLIC_AUTH0_DOMAIN;
  const AUTH0_CLIENT_ID =
    process.env.PUBLIC_AUTH0_CLIENT_ID ||
    (import.meta as any).env?.PUBLIC_AUTH0_CLIENT_ID;
  // Generic OIDC (e.g., Zitadel) end-session support
  const OIDC_END_SESSION =
    process.env.PUBLIC_OIDC_END_SESSION_ENDPOINT ||
    (import.meta as any).env?.PUBLIC_OIDC_END_SESSION_ENDPOINT;
  const OIDC_CLIENT_ID =
    process.env.PUBLIC_OIDC_CLIENT_ID ||
    (import.meta as any).env?.PUBLIC_OIDC_CLIENT_ID;
  const host = new URL(origin).host;
  const isLocal = host.includes("127.0.0.1") || host.includes("localhost");
  // We'll return to site root, letting Access trigger the correct login flow

  // If generic OIDC end-session is configured (e.g., Zitadel), prefer that
  if (!isLocal && OIDC_END_SESSION) {
    // After OIDC logout, redirect to Cloudflare Access logout which will clear the session
    const cfAccessLogout = new URL("/cdn-cgi/access/logout", origin);
    const endSession = new URL(OIDC_END_SESSION);

    // Build logout URL with required params
    if (OIDC_CLIENT_ID) {
      endSession.searchParams.set("client_id", OIDC_CLIENT_ID);
    }

    // Set post_logout_redirect_uri to Cloudflare Access logout
    endSession.searchParams.set(
      "post_logout_redirect_uri",
      cfAccessLogout.toString(),
    );

    // Try to get ID token from Cloudflare Access identity
    // The ID token should be passed as id_token_hint to avoid account selector
    try {
      const identityUrl = new URL("/cdn-cgi/access/get-identity", origin);
      const identityResponse = await fetch(identityUrl.toString(), {
        headers: request.headers,
      });

      if (identityResponse.ok) {
        const identity = await identityResponse.json();
        // Cloudflare Access provides the IdP's ID token in the identity response
        if (identity.id_token || identity.idToken) {
          endSession.searchParams.set("id_token_hint", identity.id_token || identity.idToken);
        }
      }
    } catch (error) {
      // If we can't get the ID token, proceed without it
      // User may see account selector at IdP
    }

    return new Response(null, {
      status: 302,
      headers: { Location: endSession.toString() },
    });
  }

  // If Auth0 is configured, do IdP-first logout to clear SSO before Access logout
  if (!isLocal && AUTH0_DOMAIN && AUTH0_CLIENT_ID) {
    // After IdP logout, hit CF Access logout then return to '/', allowing Access to redirect to team login
    const cfLogout = new URL("/cdn-cgi/access/logout", origin);
    cfLogout.searchParams.set("returnTo", new URL("/", origin).toString());
    const auth0Logout = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
    auth0Logout.searchParams.set("client_id", AUTH0_CLIENT_ID);
    auth0Logout.searchParams.set("returnTo", cfLogout.toString());
    return new Response(null, {
      status: 302,
      headers: { Location: auth0Logout.toString() },
    });
  }

  // Fallback: just clear Access and return home (Access will prompt login)
  const cfLogout = new URL("/cdn-cgi/access/logout", origin);
  cfLogout.searchParams.set("returnTo", new URL("/", origin).toString());
  return new Response(null, {
    status: 302,
    headers: { Location: cfLogout.toString() },
  });
};

export const prerender = false;

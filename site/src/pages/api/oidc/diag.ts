import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const headers = request.headers;
  const url = new URL(request.url);
  const host =
    headers.get("x-forwarded-host") || headers.get("host") || "127.0.0.1:4321";
  const proto =
    headers.get("x-forwarded-proto") ||
    (host.includes("127.0.0.1") || host.includes("localhost")
      ? "http"
      : "https");
  const origin = `${proto}://${host}`;

  const discoveryUrl =
    "https://auth.wenzelarifiandi.com/.well-known/openid-configuration";
  let discovery: any = null;
  let endSession: string | undefined;
  let authorizationEndpoint: string | undefined;
  let error: any = null;

  try {
    const res = await fetch(discoveryUrl);
    discovery = await res.json();
    endSession = discovery?.end_session_endpoint;
    authorizationEndpoint = discovery?.authorization_endpoint;
  } catch (e: any) {
    // Log detailed error server-side for diagnostics, but do not expose details to clients
    console.error("OIDC discovery fetch failed", e);
    error = { message: "Failed to fetch OIDC discovery document" };
  }

  // Build OIDC end-session link if env present
  const OIDC_END_SESSION = process.env.PUBLIC_OIDC_END_SESSION_ENDPOINT;
  const OIDC_CLIENT_ID = process.env.PUBLIC_OIDC_CLIENT_ID;
  let idpLogoutHref: string | undefined;
  const postLogout = new URL("/logged-out", origin).toString();
  if (OIDC_END_SESSION || endSession) {
    const u = new URL((OIDC_END_SESSION || endSession!)!);
    u.searchParams.set("post_logout_redirect_uri", postLogout);
    if (OIDC_CLIENT_ID) u.searchParams.set("client_id", OIDC_CLIENT_ID);
    idpLogoutHref = u.toString();
  }

  // Heuristic: common Cloudflare Access redirect URL patterns
  const cfTeam = process.env.CF_TEAM_DOMAIN; // optional hint, e.g., myteam.cloudflareaccess.com or custom domain
  const cfRedirects = [
    `https://${host}/cdn-cgi/access/callback`,
    cfTeam ? `https://${cfTeam}/cdn-cgi/access/callback` : undefined,
  ].filter(Boolean) as string[];

  // Accept inputs for a live authorization test
  const inputClientId =
    url.searchParams.get("client_id") || OIDC_CLIENT_ID || undefined;
  const inputRedirect =
    url.searchParams.get("redirect_uri") || (cfRedirects[0] ?? undefined);
  const inputScope = url.searchParams.get("scope") || "openid profile email";
  const inputResponseType = url.searchParams.get("response_type") || "code";

  let authTest:
    | undefined
    | {
        url?: string;
        status?: number;
        location?: string | null;
        bodyPreview?: string;
        hint?: string;
      };

  if (authorizationEndpoint && inputClientId && inputRedirect) {
    try {
      const u = new URL(authorizationEndpoint);
      u.searchParams.set("client_id", inputClientId);
      u.searchParams.set("response_type", inputResponseType);
      u.searchParams.set("redirect_uri", inputRedirect);
      u.searchParams.set("scope", inputScope);
      u.searchParams.set("state", "diag_state");
      u.searchParams.set("nonce", "diag_nonce");

      const resp = await fetch(u.toString(), { redirect: "manual" });
      const status = resp.status;
      const location = resp.headers.get("location");
      let bodyPreview: string | undefined;
      let hint: string | undefined;

      // Try to read some body content if error
      if (status >= 400 && status < 600) {
        const text = await resp.text();
        bodyPreview = text.slice(0, 500);
        if (/Errors\.App\.NotFound/i.test(text)) {
          hint =
            "Zitadel says the application (client_id) is not found. Use the exact Client ID from your Zitadel app.";
        } else if (/redirect/iu.test(text)) {
          hint =
            "Redirect URI likely does not match the one registered in Zitadel. Paste Cloudflare's exact callback URL into Zitadel.";
        }
      } else if (status >= 300 && status < 400 && location) {
        // Redirect is good; likely the client_id and redirect are valid
        hint =
          "Authorization request accepted. If Cloudflare Access shows next, the setup is correct.";
      }

      authTest = { url: u.toString(), status, location, bodyPreview, hint };
    } catch (e: any) {
      // Avoid exposing sensitive error details in stack traces
      authTest = {
        hint: "Auth test failed: Unable to complete authorization request",
      };
    }
  }

  return new Response(
    JSON.stringify(
      {
        now: new Date().toISOString(),
        origin,
        cfRedirectCandidates: cfRedirects,
        discoveryUrl,
        discovery,
        authorizationEndpoint,
        endSessionEndpoint: endSession,
        inputs: {
          client_id: inputClientId,
          redirect_uri: inputRedirect,
          scope: inputScope,
          response_type: inputResponseType,
        },
        env: {
          PUBLIC_OIDC_END_SESSION_ENDPOINT:
            process.env.PUBLIC_OIDC_END_SESSION_ENDPOINT,
          PUBLIC_OIDC_CLIENT_ID: process.env.PUBLIC_OIDC_CLIENT_ID,
          CF_TEAM_DOMAIN: process.env.CF_TEAM_DOMAIN,
        },
        idpLogoutHref,
        authTest,
        error,
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
};

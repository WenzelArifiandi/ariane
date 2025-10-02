import type { APIRoute } from "astro";

const DEFAULT_END_SESSION_ENDPOINT =
  "https://cipher.wenzelarifiandi.com/oidc/v1/end_session";

const env = (key: string): string | undefined => {
  const meta = (import.meta as any)?.env ?? {};
  return meta[key] ?? process.env[key];
};

const buildAbsoluteUrl = (url: URL, headers: Headers): { origin: string } => {
  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost || headers.get("host") || url.host;
  const forwardedProto = headers.get("x-forwarded-proto");
  const proto =
    forwardedProto ||
    (host && (host.includes("localhost") || host.includes("127.0.0.1"))
      ? "http"
      : "https");
  const origin = host ? `${proto}://${host}` : `${url.protocol}//${url.host}`;
  return { origin };
};

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  params.delete("__cf_access_message");

  const { origin } = buildAbsoluteUrl(url, request.headers);
  const redirectParam = params.get("redirect") || "/";

  let finalRedirect: string;
  try {
    finalRedirect = new URL(redirectParam, origin).toString();
  } catch (error) {
    console.warn("[/api/auth/logout] Invalid redirect parameter", {
      redirectParam,
      error,
    });
    finalRedirect = origin;
  }

  const endSessionEndpoint =
    env("PUBLIC_OIDC_END_SESSION_ENDPOINT") ||
    env("OIDC_END_SESSION_ENDPOINT") ||
    DEFAULT_END_SESSION_ENDPOINT;
  const clientId =
    env("PUBLIC_OIDC_CLIENT_ID") ||
    env("OIDC_CLIENT_ID") ||
    env("CIPHER_CLIENT_ID");

  try {
    const idpLogout = new URL(endSessionEndpoint);
    idpLogout.searchParams.set("post_logout_redirect_uri", finalRedirect);
    if (clientId) {
      idpLogout.searchParams.set("client_id", clientId);
    }

    const state = params.get("state");
    if (state) {
      idpLogout.searchParams.set("state", state);
    }

    return redirect(idpLogout.toString(), 302);
  } catch (error) {
    console.warn("[/api/auth/logout] Failed to build IdP logout URL", {
      endSessionEndpoint,
      error,
    });
    return redirect(finalRedirect, 302);
  }
};

export const prerender = false;


import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const headers = request.headers;
  const host = headers.get('x-forwarded-host') || headers.get('host') || '127.0.0.1:4321';
  const proto = headers.get('x-forwarded-proto') || (host.includes('127.0.0.1') || host.includes('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  const discoveryUrl = 'https://auth.wenzelarifiandi.com/.well-known/openid-configuration';
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
    error = { message: e?.message || String(e) };
  }

  // Build OIDC end-session link if env present
  const OIDC_END_SESSION = process.env.PUBLIC_OIDC_END_SESSION_ENDPOINT;
  const OIDC_CLIENT_ID = process.env.PUBLIC_OIDC_CLIENT_ID;
  let idpLogoutHref: string | undefined;
  const postLogout = new URL('/logged-out', origin).toString();
  if ((OIDC_END_SESSION || endSession)) {
    const u = new URL((OIDC_END_SESSION || endSession!)!);
    u.searchParams.set('post_logout_redirect_uri', postLogout);
    if (OIDC_CLIENT_ID) u.searchParams.set('client_id', OIDC_CLIENT_ID);
    idpLogoutHref = u.toString();
  }

  // Heuristic: common Cloudflare Access redirect URL patterns
  const cfTeam = process.env.CF_TEAM_DOMAIN; // optional hint, e.g., myteam.cloudflareaccess.com or custom domain
  const cfRedirects = [
    `https://${host}/cdn-cgi/access/callback`,
    cfTeam ? `https://${cfTeam}/cdn-cgi/access/callback` : undefined,
  ].filter(Boolean);

  const sampleAuthUrl = (clientId?: string) => {
    if (!authorizationEndpoint || !clientId) return undefined;
    const u = new URL(authorizationEndpoint);
    u.searchParams.set('client_id', clientId);
    u.searchParams.set('response_type', 'code');
    // Use first candidate redirect as an example
    if (cfRedirects[0]) u.searchParams.set('redirect_uri', String(cfRedirects[0]));
    u.searchParams.set('scope', 'openid profile email');
    u.searchParams.set('state', 'diag_state');
    u.searchParams.set('nonce', 'diag_nonce');
    return u.toString();
  };

  return new Response(JSON.stringify({
    now: new Date().toISOString(),
    origin,
    cfRedirectCandidates: cfRedirects,
    discoveryUrl,
    discovery,
    authorizationEndpoint,
    endSessionEndpoint: endSession,
    env: {
      PUBLIC_OIDC_END_SESSION_ENDPOINT: process.env.PUBLIC_OIDC_END_SESSION_ENDPOINT,
      PUBLIC_OIDC_CLIENT_ID: process.env.PUBLIC_OIDC_CLIENT_ID,
      CF_TEAM_DOMAIN: process.env.CF_TEAM_DOMAIN,
    },
    sampleAuthUrlHint: 'Set CF_TEAM_DOMAIN and provide Zitadel client_id to build a test URL manually with the above authorizationEndpoint and cfRedirectCandidates[0] as redirect_uri.',
    idpLogoutHref,
    error,
  }, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

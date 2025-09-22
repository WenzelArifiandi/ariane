import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * API endpoint to check if user is authenticated via Cloudflare Access
 * Returns authentication status based on Cloudflare Access headers
 */
export const GET: APIRoute = async ({ request }) => {
  // Cloudflare Access injects these headers when user is authenticated
  const cfAccessJwt = request.headers.get('cf-access-jwt-assertion');
  const cfAccessEmail = request.headers.get('cf-access-authenticated-user-email');

  // Check if user is authenticated through Cloudflare Access
  const isAuthenticated = !!(cfAccessJwt && cfAccessEmail);

  return new Response(JSON.stringify({
    authenticated: isAuthenticated,
    email: cfAccessEmail || null,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
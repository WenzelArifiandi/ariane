import type { APIRoute } from 'astro';
import { verify as verifySig } from '../../../lib/auth/signer';
import { getEnv } from '../../../lib/auth/config';

export const GET: APIRoute = async ({ request }) => {
  const secret = getEnv('SESSION_SECRET', 'dev-secret-change-me');
  const cookieHeader = request.headers.get('cookie') || '';
  const sessionCookie = cookieHeader.split(/;\s*/).find((c) => c.startsWith('session='));
  if (!sessionCookie)
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  const signed = sessionCookie.split('=')[1];
  const payload = verifySig(signed, secret);
  if (!payload)
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    const session = JSON.parse(payload);
    const now = Date.now();
    if (session.exp && now < session.exp) {
      return new Response(JSON.stringify({ authenticated: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {}
  return new Response(JSON.stringify({ authenticated: false }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const prerender = false;

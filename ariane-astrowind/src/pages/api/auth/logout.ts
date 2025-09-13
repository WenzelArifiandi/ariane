import type { APIRoute } from 'astro';
import { clearCookie } from '../../../lib/auth/signer';
import { isProd } from '../../../lib/auth/config';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': clearCookie('session', { secure: isProd() }) },
  });
};

export const prerender = false;

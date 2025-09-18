import type { APIRoute } from 'astro';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getOriginFromRequest, getRpIdFromOrigin, isProd, getEnv } from '../../../lib/auth/config';
import { sign, makeCookie } from '../../../lib/auth/signer';
import { store } from '../../../lib/auth/store';

const USER_ID = 'admin';

export const GET: APIRoute = async ({ request }) => {
  const origin = getOriginFromRequest(request);
  const rpID = getRpIdFromOrigin(origin);
  const creds = store.getByUser(USER_ID);
  // simplewebauthn/server@10 expects base64url string IDs, not Buffers
  const allowCredentials = creds.map(c => ({ id: c.id, type: 'public-key' as const }));

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials,
  });

  const secret = getEnv('SESSION_SECRET');
  const payload = JSON.stringify({ c: options.challenge, t: Date.now() });
  const cookie = makeCookie('webauthn_chal', sign(payload, secret), { httpOnly: true, secure: isProd(), sameSite: 'Strict', path: '/', maxAge: 300 });

  return new Response(JSON.stringify(options), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  });
};

export const prerender = false;

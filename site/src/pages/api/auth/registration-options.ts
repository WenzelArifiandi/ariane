import type { APIRoute } from 'astro';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getOriginFromRequest, getRpIdFromOrigin, isProd, getEnv } from '../../../lib/auth/config';
import { isApproved } from '../../../lib/sanityServer';
import { sign, makeCookie } from '../../../lib/auth/signer';

const USER_ID = 'admin';
const USER_NAME = 'Site Admin';

export const GET: APIRoute = async ({ request }) => {
  // Allow registration when explicitly enabled OR the email is approved.
  const allowReg = process.env.ALLOW_REGISTRATION === 'true';
  const url = new URL(request.url)
  const email = url.searchParams.get('email') || ''
  const approved = email.includes('@') ? await isApproved(email) : false
  if (!allowReg && !approved) {
    return new Response('Registration closed', { status: 403 });
  }
  const origin = getOriginFromRequest(request);
  const rpID = getRpIdFromOrigin(origin);
  const options = await generateRegistrationOptions({
    rpName: 'Ariane',
    rpID,
    userID: Buffer.from(USER_ID),
    userName: USER_NAME,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  // Sign the challenge into an HttpOnly cookie for later verification
  const secret = getEnv('SESSION_SECRET', 'dev-secret-change-me');
  const payload = JSON.stringify({ c: options.challenge, t: Date.now() });
  const cookie = makeCookie(
    'webauthn_chal',
    sign(payload, secret),
    { httpOnly: true, secure: isProd(), sameSite: 'Strict', path: '/', maxAge: 300 }
  );

  return new Response(JSON.stringify(options), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
};

export const prerender = false;

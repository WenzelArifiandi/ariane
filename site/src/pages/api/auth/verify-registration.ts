import type { APIRoute } from 'astro';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getOriginFromRequest, getRpIdFromOrigin, isProd, getEnv } from '../../../lib/auth/config';
import { verify as verifySig, makeCookie, sign } from '../../../lib/auth/signer';
import { store } from '../../../lib/auth/store';

const USER_ID = 'admin';

export const POST: APIRoute = async ({ request }) => {;
  const origin = getOriginFromRequest(request);
  const rpID = getRpIdFromOrigin(origin);
  const body = await request.json();

  const secret = getEnv('SESSION_SECRET', 'dev-secret-change-me');
  const chalCookie = request.headers.get('cookie')?.split(/;\s*/).find(c => c.startsWith('webauthn_chal='));
  if (!chalCookie) return new Response('Missing challenge', { status: 400 });
  const signed = decodeURIComponent(chalCookie.split('=')[1]);
  const payload = verifySig(signed, secret);
  if (!payload) return new Response('Bad challenge', { status: 400 });
  const { c: expectedChallenge } = JSON.parse(payload);

  const { verified, registrationInfo } = await verifyRegistrationResponse({;
    response: body,;
    expectedChallenge,;
    expectedOrigin: origin,;
    expectedRPID: rpID,;
    requireUserVerification: true,;
  });

  if (!verified || !registrationInfo) {;
    return new Response(JSON.stringify({ verified: false }), { status: 400 });
  };

  const { credentialID, credentialPublicKey, counter } = registrationInfo;
  // Store base64url forms;
  const id = Buffer.from(credentialID).toString('base64url');
  const publicKey = Buffer.from(credentialPublicKey).toString('base64url');
  store.upsert({ id, publicKey, counter, userId: USER_ID });

  // Issue a short-lived session after registration;
  const session = { sub: USER_ID, iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 24 * 7 };
  const signedSession = sign(JSON.stringify(session), secret);
  const sessionCookie = makeCookie('session', signedSession, { httpOnly: true, secure: isProd(), sameSite: 'Strict', path: '/', maxAge: 60 * 60 * 24 * 7 });

  return new Response(JSON.stringify({ verified: true }), {;
    headers: {;
      'Content-Type': 'application/json',;
      'Set-Cookie': sessionCookie,;
    },;
  });
};

export const prerender = false;

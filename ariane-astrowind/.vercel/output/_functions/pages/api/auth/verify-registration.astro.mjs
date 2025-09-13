import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { g as getOriginFromRequest, a as getRpIdFromOrigin, b as getEnv, v as verify, s as sign, m as makeCookie, i as isProd } from '../../../chunks/signer_BzIjp19d.mjs';
import { s as store } from '../../../chunks/store_V3z1A3QB.mjs';
export { renderers } from '../../../renderers.mjs';

const USER_ID = "admin";
const POST = async ({ request }) => {
  const origin = getOriginFromRequest(request);
  const rpID = getRpIdFromOrigin(origin);
  const body = await request.json();
  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const chalCookie = request.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith("webauthn_chal="));
  if (!chalCookie) return new Response("Missing challenge", { status: 400 });
  const signed = decodeURIComponent(chalCookie.split("=")[1]);
  const payload = verify(signed, secret);
  if (!payload) return new Response("Bad challenge", { status: 400 });
  const { c: expectedChallenge } = JSON.parse(payload);
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true
  });
  if (!verified || !registrationInfo) {
    return new Response(JSON.stringify({ verified: false }), { status: 400 });
  }
  const { credentialID, credentialPublicKey, counter } = registrationInfo;
  const id = Buffer.from(credentialID).toString("base64url");
  const publicKey = Buffer.from(credentialPublicKey).toString("base64url");
  store.upsert({ id, publicKey, counter, userId: USER_ID });
  const session = { sub: USER_ID, iat: Date.now(), exp: Date.now() + 1e3 * 60 * 60 * 24 * 7 };
  const signedSession = sign(JSON.stringify(session), secret);
  const sessionCookie = makeCookie("session", signedSession, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "Strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return new Response(JSON.stringify({ verified: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookie
    }
  });
};
const prerender = false;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

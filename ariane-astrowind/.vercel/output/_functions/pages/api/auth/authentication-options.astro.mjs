import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { g as getOriginFromRequest, a as getRpIdFromOrigin, b as getEnv, m as makeCookie, i as isProd, s as sign } from '../../../chunks/signer_BzIjp19d.mjs';
import { s as store } from '../../../chunks/store_V3z1A3QB.mjs';
export { renderers } from '../../../renderers.mjs';

const USER_ID = "admin";
const GET = async ({ request }) => {
  const origin = getOriginFromRequest(request);
  const rpID = getRpIdFromOrigin(origin);
  const creds = store.getByUser(USER_ID);
  const allowCredentials = creds.map((c) => ({ id: c.id, type: "public-key" }));
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials
  });
  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const payload = JSON.stringify({ c: options.challenge, t: Date.now() });
  const cookie = makeCookie("webauthn_chal", sign(payload, secret), {
    httpOnly: true,
    secure: isProd(),
    sameSite: "Strict",
    path: "/",
    maxAge: 300
  });
  return new Response(JSON.stringify(options), {
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie }
  });
};
const prerender = false;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

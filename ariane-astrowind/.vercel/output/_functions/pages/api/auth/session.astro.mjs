import { b as getEnv, v as verify } from '../../../chunks/signer_BzIjp19d.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ request }) => {
  const secret = getEnv("SESSION_SECRET", "dev-secret-change-me");
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionCookie = cookieHeader.split(/;\s*/).find((c) => c.startsWith("session="));
  if (!sessionCookie)
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { "Content-Type": "application/json" }
    });
  const signed = sessionCookie.split("=")[1];
  const payload = verify(signed, secret);
  if (!payload)
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { "Content-Type": "application/json" }
    });
  try {
    const session = JSON.parse(payload);
    const now = Date.now();
    if (session.exp && now < session.exp) {
      return new Response(JSON.stringify({ authenticated: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch {
  }
  return new Response(JSON.stringify({ authenticated: false }), {
    headers: { "Content-Type": "application/json" }
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

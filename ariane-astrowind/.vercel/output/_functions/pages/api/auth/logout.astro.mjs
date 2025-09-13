import { c as clearCookie, i as isProd } from '../../../chunks/signer_BzIjp19d.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async () => {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookie("session", { secure: isProd() }) }
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

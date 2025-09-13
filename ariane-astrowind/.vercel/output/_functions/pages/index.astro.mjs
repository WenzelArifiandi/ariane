import { d as createAstro, c as createComponent } from '../chunks/astro/server_Dd1ybPcg.mjs';
import 'kleur/colors';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://wenzelarifiandi.com");
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  return Astro2.redirect("/personal");
}, "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/pages/index.astro", void 0);

const $$file = "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

import { c as createComponent, m as maybeRenderHead, a as renderTemplate } from './astro/server_Dd1ybPcg.mjs';
import 'kleur/colors';
import 'clsx';
import { S as SITE } from './permalinks_BqIyvsQ-.mjs';

const $$Logo = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<span class="self-center ml-2 rtl:ml-0 rtl:mr-2 text-2xl md:text-xl font-bold text-gray-900 whitespace-nowrap dark:text-white">
🚀 ${SITE?.name} </span>`;
}, "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/components/Logo.astro", void 0);

export { $$Logo as $ };

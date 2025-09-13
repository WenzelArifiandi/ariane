import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_QUkdG5oV.mjs';
import { manifest } from './manifest_Dbsu39Ub.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/about.astro.mjs');
const _page3 = () => import('./pages/api/auth/authentication-options.astro.mjs');
const _page4 = () => import('./pages/api/auth/logout.astro.mjs');
const _page5 = () => import('./pages/api/auth/registration-options.astro.mjs');
const _page6 = () => import('./pages/api/auth/request-access.astro.mjs');
const _page7 = () => import('./pages/api/auth/session.astro.mjs');
const _page8 = () => import('./pages/api/auth/verify-authentication.astro.mjs');
const _page9 = () => import('./pages/api/auth/verify-registration.astro.mjs');
const _page10 = () => import('./pages/contact.astro.mjs');
const _page11 = () => import('./pages/homes/mobile-app.astro.mjs');
const _page12 = () => import('./pages/homes/personal.astro.mjs');
const _page13 = () => import('./pages/homes/saas.astro.mjs');
const _page14 = () => import('./pages/homes/startup.astro.mjs');
const _page15 = () => import('./pages/landing/click-through.astro.mjs');
const _page16 = () => import('./pages/landing/lead-generation.astro.mjs');
const _page17 = () => import('./pages/landing/pre-launch.astro.mjs');
const _page18 = () => import('./pages/landing/product.astro.mjs');
const _page19 = () => import('./pages/landing/sales.astro.mjs');
const _page20 = () => import('./pages/landing/subscription.astro.mjs');
const _page21 = () => import('./pages/personal.astro.mjs');
const _page22 = () => import('./pages/pricing.astro.mjs');
const _page23 = () => import('./pages/privacy.astro.mjs');
const _page24 = () => import('./pages/rss.xml.astro.mjs');
const _page25 = () => import('./pages/services.astro.mjs');
const _page26 = () => import('./pages/terms.astro.mjs');
const _page27 = () => import('./pages/_---blog_/_category_/_---page_.astro.mjs');
const _page28 = () => import('./pages/_---blog_/_tag_/_---page_.astro.mjs');
const _page29 = () => import('./pages/_---blog_/_---page_.astro.mjs');
const _page30 = () => import('./pages/index.astro.mjs');
const _page31 = () => import('./pages/_---blog_.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/about.astro", _page2],
    ["src/pages/api/auth/authentication-options.ts", _page3],
    ["src/pages/api/auth/logout.ts", _page4],
    ["src/pages/api/auth/registration-options.ts", _page5],
    ["src/pages/api/auth/request-access.ts", _page6],
    ["src/pages/api/auth/session.ts", _page7],
    ["src/pages/api/auth/verify-authentication.ts", _page8],
    ["src/pages/api/auth/verify-registration.ts", _page9],
    ["src/pages/contact.astro", _page10],
    ["src/pages/homes/mobile-app.astro", _page11],
    ["src/pages/homes/personal.astro", _page12],
    ["src/pages/homes/saas.astro", _page13],
    ["src/pages/homes/startup.astro", _page14],
    ["src/pages/landing/click-through.astro", _page15],
    ["src/pages/landing/lead-generation.astro", _page16],
    ["src/pages/landing/pre-launch.astro", _page17],
    ["src/pages/landing/product.astro", _page18],
    ["src/pages/landing/sales.astro", _page19],
    ["src/pages/landing/subscription.astro", _page20],
    ["src/pages/personal.astro", _page21],
    ["src/pages/pricing.astro", _page22],
    ["src/pages/privacy.md", _page23],
    ["src/pages/rss.xml.ts", _page24],
    ["src/pages/services.astro", _page25],
    ["src/pages/terms.md", _page26],
    ["src/pages/[...blog]/[category]/[...page].astro", _page27],
    ["src/pages/[...blog]/[tag]/[...page].astro", _page28],
    ["src/pages/[...blog]/[...page].astro", _page29],
    ["src/pages/index.astro", _page30],
    ["src/pages/[...blog]/index.astro", _page31]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "cfe9d473-080c-4c7f-b243-0c20e43115b4",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };

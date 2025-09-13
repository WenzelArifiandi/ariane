import { c as createComponent, a as renderTemplate, b as addAttribute, m as maybeRenderHead, r as renderComponent, F as Fragment } from '../chunks/astro/server_Dd1ybPcg.mjs';
import 'kleur/colors';
import { $ as $$PageLayout } from '../chunks/PageLayout_CEqqXoYZ.mjs';
import 'clsx';
/* empty css                                    */
export { renderers } from '../renderers.mjs';

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(cooked.slice()) }));
var _a$1;
const $$Nav = createComponent(async ($$result, $$props, $$slots) => {
  const links = [
    { label: "Work", href: "#work" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" }
  ];
  const studioHref = "https://studio.wenzelarifiandi.com";
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", '<nav class="nav" data-astro-cid-lu53zf5r> <div class="container align-hero" data-astro-cid-lu53zf5r> <div class="nav-inner glass" data-astro-cid-lu53zf5r> <a href="/" class="brand" data-astro-cid-lu53zf5r>Wenzel Arifiandi</a> <ul class="links" data-astro-cid-lu53zf5r> ', ' <li id="studio-link" style="display:none" data-astro-cid-lu53zf5r><a', ` data-astro-cid-lu53zf5r>Studio</a></li> <li class="creator-wrap" data-astro-cid-lu53zf5r> <button id="creator-toggle" class="chip m3" aria-haspopup="true" aria-expanded="false" aria-controls="creator-sheet" title="Maker mode" data-astro-cid-lu53zf5r> <span class="material-symbols-rounded" aria-hidden="true" data-astro-cid-lu53zf5r>auto_awesome</span> <span class="label" data-astro-cid-lu53zf5r>Maker mode</span> </button> </li> </ul> </div> </div> </nav>  <script type="module">
  const qs = (s) => document.querySelector(s);
  const toggle = qs('#creator-toggle');
  const studio = qs('#studio-link');

  async function refreshAuth() {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      const authed = !!data?.authenticated;
      if (studio) studio.style.display = authed ? '' : 'none';
    } catch {}
  }

  toggle?.addEventListener('click', () => {
    const html = document.documentElement;
    const open = html.getAttribute('data-creator') === 'open';
    html.setAttribute('data-creator', open ? 'closed' : 'open');
    toggle.setAttribute('aria-expanded', String(!open));
    window.dispatchEvent(new CustomEvent('toggle-creator', { detail: { open: !open } }));
  });

  (async () => { await refreshAuth(); })();
</script>`])), maybeRenderHead(), links.map((l) => renderTemplate`<li data-astro-cid-lu53zf5r><a${addAttribute(l.href, "href")} data-astro-cid-lu53zf5r>${l.label}</a></li>`), addAttribute(studioHref, "href"));
}, "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/components/site/Nav.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Hero = createComponent(($$result, $$props, $$slots) => {
  const title = "Hi there!";
  const subtitle = "This site is being refreshed!";
  return renderTemplate(_a || (_a = __template(["", `<div class="creator-bar" data-astro-cid-nnb2ms2b> <div class="creator-bar__inner container align-hero" data-astro-cid-nnb2ms2b> <div class="creator-bar__text" data-astro-cid-nnb2ms2b><span class="material-symbols-rounded text-icon" aria-hidden="true" data-astro-cid-nnb2ms2b>auto_awesome</span><span class="text-label" data-astro-cid-nnb2ms2b>Entering Wenzel's maker space</span></div> <div class="creator-bar__actions" data-astro-cid-nnb2ms2b> <button id="creator-passkey" class="btn m3 small" data-mode="signin" data-astro-cid-nnb2ms2b> <span class="material-symbols-rounded icon" aria-hidden="true" data-astro-cid-nnb2ms2b>fingerprint</span> <span class="label" data-astro-cid-nnb2ms2b>Sign in with passkey</span> </button> </div> </div> </div> <section class="container align-hero" data-astro-cid-nnb2ms2b> <div class="hero" data-astro-cid-nnb2ms2b> <div class="hero__inner" data-astro-cid-nnb2ms2b> <h1 class="hero__title" data-astro-cid-nnb2ms2b>`, '</h1> <p class="hero__subtitle" data-astro-cid-nnb2ms2b>', `</p> </div> </div> </section> <!-- Enable passkey client events --> <script type="module" src="/src/scripts/maker-client.ts"><\/script>  <script type="module">
  const qs = (s) => document.querySelector(s);
  // Expressive spring for the bar (fast spatial)
  let raf = 0; let current = 0; let target = 0; let lastTs = 0;
  const SPRING = { stiffness: 540, damping: 32 };
  function tick(ts){
    if(!lastTs) lastTs = ts; const dt = Math.min(32, ts - lastTs); lastTs = ts;
    const delta = target - current;
    const accel = delta * SPRING.stiffness - current * SPRING.damping;
    current += accel * (dt / 1000);
    current = Math.max(0, Math.min(1, current));
    document.querySelector('.creator-bar')?.style.setProperty('--p', String(current));
    if (Math.abs(delta) > 0.002) { raf = requestAnimationFrame(tick); } else { current = target; document.querySelector('.creator-bar')?.style.setProperty('--p', String(target)); raf = 0; lastTs = 0; }
  }
  // Support toggling via Creator chip in nav
  window.addEventListener('toggle-creator', (ev) => {
    const open = ev.detail?.open;
    target = open ? 1 : 0;
    if (!raf) raf = requestAnimationFrame(tick);
    if (open) document.querySelector('#creator-passkey')?.focus?.();
  });
<\/script>`])), maybeRenderHead(), title, subtitle);
}, "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/components/site/Hero.astro", void 0);

const $$Personal = createComponent(($$result, $$props, $$slots) => {
  const metadata = {
    title: "Wenzel Arifiandi",
    description: "Hi there!"
  };
  const email = "hello@wenzelarifiandi.com";
  return renderTemplate`${renderComponent($$result, "Layout", $$PageLayout, { "metadata": metadata, "data-astro-cid-y53kbovx": true }, { "announcement": ($$result2) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "slot": "announcement" })}`, "default": ($$result2) => renderTemplate`   ${renderComponent($$result2, "Nav", $$Nav, { "data-astro-cid-y53kbovx": true })} ${renderComponent($$result2, "Hero", $$Hero, { "data-astro-cid-y53kbovx": true })} ${maybeRenderHead()}<section id="work" class="container align-hero" data-astro-cid-y53kbovx> <div class="section__inner" data-astro-cid-y53kbovx> <h2 data-astro-cid-y53kbovx>Work</h2> <p class="muted" data-astro-cid-y53kbovx>Selected projects will appear here soon.</p> </div> </section> <section id="about" class="container align-hero" data-astro-cid-y53kbovx> <div class="section__inner" data-astro-cid-y53kbovx> <h2 data-astro-cid-y53kbovx>About</h2> <p class="muted" data-astro-cid-y53kbovx>More details coming shortly.</p> </div> </section> <section id="contact" class="container align-hero page-spacer" data-astro-cid-y53kbovx> <div class="section__inner" data-astro-cid-y53kbovx> <h2 data-astro-cid-y53kbovx>Contact</h2> <p class="muted" data-astro-cid-y53kbovx>Email me at <a${addAttribute(`mailto:${email}`, "href")} class="accent" data-astro-cid-y53kbovx>${email}</a>.</p> </div> </section> `, "header": ($$result2) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "slot": "header" })}` })} `;
}, "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/pages/personal.astro", void 0);

const $$file = "/Users/wenzelarifiandi/ariane/ariane/ariane-astrowind/src/pages/personal.astro";
const $$url = "/personal";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Personal,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

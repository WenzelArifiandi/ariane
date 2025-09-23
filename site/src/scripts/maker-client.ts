/**
 * Minimal maker UI helpers now that authentication is handled upstream
 * by Cloudflare Access and ZITADEL.
 */

function closeCreatorUI(): void {
  const bar = document.querySelector<HTMLElement>(".creator-bar");
  const mount = document.querySelector<HTMLElement>("#access-mount");
  document.documentElement.setAttribute("data-creator", "closed");
  bar?.classList.remove("access-open");
  if (mount) mount.textContent = "";
}

function setupMakerChip(): void {
  const makerChip = document.querySelector<HTMLButtonElement>("#creator-toggle");
  const navInner = document.querySelector<HTMLElement>(".nav-inner");
  if (!makerChip || !navInner) return;

  const adjustMakerChip = () => {
    makerChip.classList.remove("compact");
    const overflow = Math.ceil(navInner.scrollWidth - navInner.clientWidth);
    const needsCompact = overflow > 12 || window.innerWidth < 420;
    makerChip.classList.toggle("compact", needsCompact);
  };

  adjustMakerChip();

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(adjustMakerChip);
    observer.observe(navInner);
  } else {
    window.addEventListener("resize", adjustMakerChip);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(adjustMakerChip).catch(() => {});
  }
}

function attachEvents(): void {
  setupMakerChip();

  window.addEventListener(
    "toggle-creator",
    (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      if (!customEvent.detail?.open) closeCreatorUI();
    },
    { passive: true }
  );
}

let ready = false;
function onReady() {
  if (ready) return;
  ready = true;
  attachEvents();
}

document.addEventListener("astro:page-load", onReady);
document.addEventListener("DOMContentLoaded", onReady);

// Tiny debug helper for manual testing in the console
// @ts-ignore
(globalThis as any).__maker = { close: closeCreatorUI };

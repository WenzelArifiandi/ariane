// WebAuthn and Material Web are imported lazily to keep initial bundle light
let startRegistration: unknown;
let startAuthentication: unknown;

async function ensureWebAuthn() {
  if (startRegistration && startAuthentication) return;
  const mod = await import("@simplewebauthn/browser");
  startRegistration = (mod as Record<string, unknown>).startRegistration;
  startAuthentication = (mod as Record<string, unknown>).startAuthentication;
}

// Material Web not required for access UI anymore; using native inputs

function qs<T extends Element = Element>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

async function refreshAuth() {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("session check failed");
    const data = await res.json();
    const authed = !!data?.authenticated;
    const studio = qs("#studio-link") as HTMLLIElement | null;
    if (studio) {
      studio.style.display = authed ? "" : "none";
      const a = studio.querySelector("a") as HTMLAnchorElement | null;
      if (a) {
        a.href =
          location.hostname === "localhost"
            ? "http://localhost:3333/"
            : "https://studio.wenzelarifiandi.com";
      }
    }
    const passkeyBtn = qs<HTMLButtonElement>("#creator-passkey");
    if (passkeyBtn) {
      const label = passkeyBtn.querySelector(".label");
      const icon = passkeyBtn.querySelector(".icon");
      if (authed) {
        passkeyBtn.dataset.mode = "signout";
        if (label) label.textContent = "Sign out";
        if (icon) icon.textContent = "logout";
        passkeyBtn.disabled = false;
      } else {
        passkeyBtn.dataset.mode = "signin";
        if (label) label.textContent = "Sign in with passkey";
        if (icon) icon.textContent = "fingerprint";
        passkeyBtn.disabled = false;
      }
    }
  } catch {}
}

async function mountAccessUI(prefill?: string) {
  // No need to preload Material Web here; use plain HTML controls for reliability
  const mount = (document.querySelector("#access-mount") ||
    document.querySelector(".creator-bar .creator-bar__actions") ||
    document.querySelector(
      ".creator-bar .creator-bar__inner",
    )) as HTMLElement | null;
  const bar = document.querySelector(".creator-bar") as HTMLElement | null;
  if (!mount || document.querySelector("#req-access")) return;
  if (bar) bar.classList.add("access-open");
  const wrap = document.createElement("div");
  wrap.className = "access-ui";
  // Create elements safely using DOM methods instead of innerHTML to prevent XSS
  const card = document.createElement("div");
  card.className = "liquid-glass access-card m3-card";

  const head = document.createElement("div");
  head.className = "head";

  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "mail";

  const titles = document.createElement("div");
  titles.className = "titles";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "Join the maker space";

  const support = document.createElement("div");
  support.className = "support";
  support.textContent =
    "Can't wait to welcome you into the makerspace! Pop your email below to request access, and I'll reach out as soon as it's ready.";

  titles.appendChild(title);
  titles.appendChild(support);
  head.appendChild(icon);
  head.appendChild(titles);

  const form = document.createElement("form");
  form.id = "req-access";
  form.className = "form";

  const emailInput = document.createElement("input");
  emailInput.id = "email";
  emailInput.name = "email";
  emailInput.type = "email";
  emailInput.required = true;
  emailInput.placeholder = "you@example.com";
  emailInput.className = "field";
  if (prefill) emailInput.value = prefill;

  const submitButton = document.createElement("button");
  submitButton.className = "btn m3";
  submitButton.type = "submit";
  submitButton.textContent = "Send request";

  form.appendChild(emailInput);
  form.appendChild(submitButton);
  card.appendChild(head);
  card.appendChild(form);
  wrap.appendChild(card);
  mount.appendChild(wrap);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = String(emailInput.value ?? "").trim();
    if (!email || !email.includes("@")) return;
    localStorage.setItem("maker_email", email);
    await fetch("/api/auth/request-access", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    wrap.innerHTML =
      "<div class='liquid-glass access-card m3-card'><div class='head'><span class='material-symbols-rounded' aria-hidden='true'>check_circle</span><div class='titles'><div class='title'>Request sent</div><div class='support'>Thanks — I’ll review and let you know soon.</div></div></div></div>";
  });
  // focus
  const emailEl = wrap.querySelector("#email") as HTMLInputElement | null;
  emailEl?.focus?.();
  // attempt to select existing value for quick edit
  try {
    emailEl?.select?.();
  } catch {}
  document.documentElement.setAttribute("data-creator", "open");
}

function closeCreatorUI() {
  const bar = document.querySelector(".creator-bar") as HTMLElement | null;
  const mount = document.querySelector("#access-mount") as HTMLElement | null;
  document.documentElement.setAttribute("data-creator", "closed");
  if (bar) bar.classList.remove("access-open");
  if (mount) mount/* SECURITY: Consider using textContent or sanitize */ /* SECURITY: Consider using textContent or sanitize */ .innerHTML = "";
}

async function handlePasskeyClick() {
  console.log("[maker] Passkey button clicked"); // Debug log
  const btn = qs<HTMLButtonElement>("#creator-passkey");
  const labelEl = btn?.querySelector(".label") as HTMLSpanElement | null;
  const iconEl = btn?.querySelector(".icon") as HTMLElement | null;
  const origLabel = labelEl?.textContent;
  // If already signed in, this becomes Sign out
  const currentMode =
    qs<HTMLButtonElement>("#creator-passkey")?.dataset.mode || "signin";
  if (currentMode === "signout") {
    try {
      // busy state only for the duration of sign out
      if (btn) {
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
      }
      if (labelEl) labelEl.textContent = "Signing out…";
      if (iconEl) iconEl.textContent = "hourglass_top";
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      await refreshAuth();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
      // rely on refreshAuth() to set correct label/icon state post-logout
    }
    return;
  }
  // Prefer registration first; fallback to sign-in if already enrolled
  // Ask for an email to check approval status. Remember between attempts.
  let email = String(localStorage.getItem("maker_email") ?? "").trim();
  if (!email) {
    // If the access UI is already on screen, try to read the current value
    const existingInput = document.querySelector(
      "#req-access #email",
    ) as HTMLInputElement | null;
    const liveVal = String(existingInput?.value ?? "").trim();
    if (liveVal && liveVal.includes("@")) {
      email = liveVal;
    } else {
      await mountAccessUI();
      const afterMountInput = document.querySelector(
        "#req-access #email",
      ) as HTMLInputElement | null;
      afterMountInput?.focus?.();
      // ensure button is not left in a busy state
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
      if (labelEl && origLabel) labelEl.textContent = origLabel;
      if (iconEl) iconEl.textContent = "fingerprint";
      return;
    }
  }
  // Now we have email and can proceed: set busy state
  try {
    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }
    if (labelEl) labelEl.textContent = "Working…";
    if (iconEl) iconEl.textContent = "hourglass_top";
  } catch {}
  try {
    const status = await fetch(
      `/api/auth/approval-status?email=${encodeURIComponent(email)}`,
      { credentials: "same-origin" },
    )
      .then((r) => r.json())
      .catch(() => ({ approved: false }));
    if (
      !status?.approved &&
      String(import.meta.env.ALLOW_REGISTRATION) !== "true"
    ) {
      mountAccessUI(email);
      throw new Error("not-approved");
    }
    await ensureWebAuthn();
    const roRes = await fetch(
      `/api/auth/registration-options?email=${encodeURIComponent(email)}`,
      { credentials: "same-origin" },
    );
    if (!roRes.ok)
      throw new Error(`registration-options-failed:${roRes.status}`);
    const ro = await roRes.json();
    const att = await (startRegistration as Function)(ro);
    const vr = await fetch("/api/auth/verify-registration", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(att),
    });
    if (!vr.ok) throw new Error(`registration-verify-failed:${vr.status}`);
    await refreshAuth();
    if (location.hostname === "localhost") {
      location.assign("http://localhost:3333/");
    } else {
      location.assign("https://studio.wenzelarifiandi.com");
    }
    return;
  } catch (regErr) {
    console.warn("[maker] registration flow failed:", regErr);
    try {
      await ensureWebAuthn();
      const optRes = await fetch("/api/auth/authentication-options", {
        credentials: "same-origin",
      });
      if (!optRes.ok) throw new Error(`auth-options-failed:${optRes.status}`);
      const opts = await optRes.json();
      const assn = await (startAuthentication as Function)(opts);
      const res = await fetch("/api/auth/verify-authentication", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assn),
      });
      if (!res.ok) throw new Error(`auth-verify-failed:${res.status}`);
      await refreshAuth();
      if (location.hostname === "localhost") {
        location.assign("http://localhost:3333/");
      } else {
        location.assign("https://studio.wenzelarifiandi.com");
      }
    } catch (err) {
      // Show inline access request if both paths fail
      mountAccessUI(localStorage.getItem("maker_email") || "");
      console.error("[maker] auth flow failed:", err);
    }
  } finally {
    try {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
      if (labelEl && origLabel) labelEl.textContent = origLabel;
      if (iconEl) iconEl.textContent = "fingerprint";
    } catch {}
  }
}

function attachEvents() {
  const passkeyBtn = qs<HTMLButtonElement>("#creator-passkey");
  if (passkeyBtn) passkeyBtn.addEventListener("click", handlePasskeyClick);
  // Prevent maker chip from wrapping: switch to icon-only if it would wrap
  const makerChip = qs<HTMLButtonElement>("#creator-toggle");
  const adjustMakerChip = () => {
    if (!makerChip) return;
    // Heuristic: if width is narrow or text would wrap, use compact
    const willWrap = makerChip.scrollWidth > makerChip.clientWidth + 2;
    const narrow = window.innerWidth < 420;
    if (narrow || willWrap) makerChip.classList.add("compact");
    else makerChip.classList.remove("compact");
  };
  if (makerChip) {
    adjustMakerChip();
    window.addEventListener("resize", adjustMakerChip);
  }
  // Listen for close events from nav toggle
  window.addEventListener("toggle-creator", (ev: Event) => {
    const customEvent = ev as CustomEvent;
    const open = customEvent?.detail?.open;
    if (!open) closeCreatorUI();
  });
}

document.addEventListener("astro:page-load", () => {
  attachEvents();
  refreshAuth();
});
document.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  refreshAuth();
});

// tiny debug helper
// @ts-ignore
(globalThis as any).__maker = { refreshAuth };

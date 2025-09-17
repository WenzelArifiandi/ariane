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
  // Use textContent to avoid accidental HTML injection.
  if (mount) mount.textContent = "";
}

interface PasskeyButtonElements {
  btn: HTMLButtonElement | null;
  labelEl: HTMLSpanElement | null;
  iconEl: HTMLElement | null;
  origLabel: string | null;
}

function getPasskeyButtonElements(): PasskeyButtonElements {
  const btn = qs<HTMLButtonElement>("#creator-passkey");
  const labelEl = btn?.querySelector(".label") as HTMLSpanElement | null;
  const iconEl = btn?.querySelector(".icon") as HTMLElement | null;
  const origLabel = labelEl?.textContent || null;

  return { btn, labelEl, iconEl, origLabel };
}

function setButtonBusyState(
  elements: PasskeyButtonElements,
  busy: boolean,
  label?: string,
  icon?: string,
) {
  const { btn, labelEl, iconEl } = elements;

  if (btn) {
    btn.disabled = busy;
    if (busy) {
      btn.setAttribute("aria-busy", "true");
    } else {
      btn.removeAttribute("aria-busy");
    }
  }

  if (labelEl && label) {
    labelEl.textContent = label;
  }

  if (iconEl && icon) {
    iconEl.textContent = icon;
  }
}

function resetButtonState(elements: PasskeyButtonElements) {
  const { btn, labelEl, iconEl, origLabel } = elements;

  if (btn) {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
  }

  if (labelEl && origLabel) {
    labelEl.textContent = origLabel;
  }

  if (iconEl) {
    iconEl.textContent = "fingerprint";
  }
}

async function handleSignOut(): Promise<void> {
  const elements = getPasskeyButtonElements();

  try {
    setButtonBusyState(elements, true, "Signing out…", "hourglass_top");

    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    await refreshAuth();
  } finally {
    resetButtonState(elements);
  }
}

function getEmailFromStorage(): string {
  return String(localStorage.getItem("maker_email") ?? "").trim();
}

function getEmailFromInput(): string {
  const existingInput = document.querySelector(
    "#req-access #email",
  ) as HTMLInputElement | null;
  return String(existingInput?.value ?? "").trim();
}

async function promptForEmail(): Promise<void> {
  const elements = getPasskeyButtonElements();

  await mountAccessUI();

  const afterMountInput = document.querySelector(
    "#req-access #email",
  ) as HTMLInputElement | null;
  afterMountInput?.focus?.();

  resetButtonState(elements);
}

async function checkApprovalStatus(email: string): Promise<boolean> {
  const status = await fetch(
    `/api/auth/approval-status?email=${encodeURIComponent(email)}`,
    { credentials: "same-origin" },
  )
    .then((r) => r.json())
    .catch(() => ({ approved: false }));

  return (
    status?.approved || String(import.meta.env.ALLOW_REGISTRATION) === "true"
  );
}

async function attemptRegistration(email: string): Promise<void> {
  await ensureWebAuthn();

  const roRes = await fetch(
    `/api/auth/registration-options?email=${encodeURIComponent(email)}`,
    { credentials: "same-origin" },
  );

  if (!roRes.ok) {
    throw new Error(`registration-options-failed:${roRes.status}`);
  }

  const ro = await roRes.json();
  const att = await (startRegistration as Function)(ro);

  const vr = await fetch("/api/auth/verify-registration", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(att),
  });

  if (!vr.ok) {
    throw new Error(`registration-verify-failed:${vr.status}`);
  }
}

async function attemptAuthentication(): Promise<void> {
  await ensureWebAuthn();

  const optRes = await fetch("/api/auth/authentication-options", {
    credentials: "same-origin",
  });

  if (!optRes.ok) {
    throw new Error(`auth-options-failed:${optRes.status}`);
  }

  const opts = await optRes.json();
  const assn = await (startAuthentication as Function)(opts);

  const res = await fetch("/api/auth/verify-authentication", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assn),
  });

  if (!res.ok) {
    throw new Error(`auth-verify-failed:${res.status}`);
  }
}

function redirectToStudio(): void {
  if (location.hostname === "localhost") {
    location.assign("http://localhost:3333/");
  } else {
    location.assign("https://studio.wenzelarifiandi.com");
  }
}

async function handlePasskeyClick() {
  console.log("[maker] Passkey button clicked"); // Debug log

  const elements = getPasskeyButtonElements();
  const currentMode = elements.btn?.dataset.mode || "signin";

  // Handle sign out
  if (currentMode === "signout") {
    await handleSignOut();
    return;
  }

  // Get email for authentication
  let email = getEmailFromStorage();

  if (!email) {
    const liveVal = getEmailFromInput();
    if (liveVal && liveVal.includes("@")) {
      email = liveVal;
    } else {
      await promptForEmail();
      return;
    }
  }

  // Set busy state for authentication process
  setButtonBusyState(elements, true, "Working…", "hourglass_top");

  try {
    // Check if user is approved
    const approved = await checkApprovalStatus(email);

    if (!approved) {
      mountAccessUI(email);
      throw new Error("not-approved");
    }

    // Try registration first, then fall back to authentication
    try {
      await attemptRegistration(email);
      await refreshAuth();
      redirectToStudio();
      return;
    } catch (regErr) {
      console.warn("[maker] registration flow failed:", regErr);

      await attemptAuthentication();
      await refreshAuth();
      redirectToStudio();
    }
  } catch (err) {
    // Show inline access request if both paths fail
    mountAccessUI(localStorage.getItem("maker_email") || "");
    console.error("[maker] auth flow failed:", err);
  } finally {
    resetButtonState(elements);
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

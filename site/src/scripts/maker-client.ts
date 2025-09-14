// WebAuthn and Material Web are imported lazily to keep initial bundle light
let startRegistration: any;
let startAuthentication: any;

async function ensureWebAuthn() {
  if (startRegistration && startAuthentication) return;
  const mod = await import('@simplewebauthn/browser');
  startRegistration = (mod as any).startRegistration;
  startAuthentication = (mod as any).startAuthentication;
}

async function ensureMaterialWeb() {
  // Side-effect imports that define <md-outlined-text-field> and <md-filled-button>
  await Promise.all([
    import('@material/web/textfield/outlined-text-field.js'),
    import('@material/web/button/filled-button.js'),
  ]);
}

function qs<T extends Element = Element>(sel: string): T | null {
  return document.querySelector(sel) as T | null;
}

async function refreshAuth() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('session check failed');
    const data = await res.json();
    const authed = !!data?.authenticated;
    const studio = qs('#studio-link') as HTMLLIElement | null;
    if (studio) {
      studio.style.display = authed ? '' : 'none';
      const a = studio.querySelector('a') as HTMLAnchorElement | null;
      if (a) {
        a.href = (location.hostname === 'localhost') ? 'http://localhost:3333/' : 'https://studio.wenzelarifiandi.com';
      }
    }
    const passkeyBtn = qs<HTMLButtonElement>('#creator-passkey');
    if (passkeyBtn) {
      const label = passkeyBtn.querySelector('.label');
      const icon = passkeyBtn.querySelector('.icon');
      if (authed) {
        passkeyBtn.dataset.mode = 'signout';
        if (label) label.textContent = 'Sign out';
        if (icon) icon.textContent = 'logout';
        passkeyBtn.disabled = false;
      } else {
        passkeyBtn.dataset.mode = 'signin';
        if (label) label.textContent = 'Sign in with passkey';
        if (icon) icon.textContent = 'fingerprint';
        passkeyBtn.disabled = false;
      }
    }
  } catch {}
}

function mountAccessUI(prefill?: string) {
  const mount = (document.querySelector('#access-mount')
    || document.querySelector('.creator-bar .creator-bar__actions')
    || document.querySelector('.creator-bar .creator-bar__inner')) as HTMLElement | null;
  const bar = document.querySelector('.creator-bar') as HTMLElement | null;
  if (!mount || document.querySelector('#req-access')) return;
  if (bar) bar.classList.add('access-open');
  const wrap = document.createElement('div');
  wrap.className = 'access-ui';
  wrap.innerHTML = `
    <div class="liquid-glass access-card m3-card">
      <div class="head">
        <span class="material-symbols-rounded" aria-hidden="true">mail</span>
        <div class="titles">
          <div class="title">Request access</div>
          <div class="support">Enter your email to request access. I’ll review in Studio and notify you.</div>
        </div>
      </div>
      <form id="req-access" class="form">
        <md-outlined-text-field id="email" name="email" label="Email" type="email" required placeholder="you@example.com" ${prefill ? `value="${prefill}"` : ''}></md-outlined-text-field>
        <md-filled-button type="submit">Request access</md-filled-button>
      </form>
    </div>`;
  mount.appendChild(wrap);
  const form = wrap.querySelector('#req-access') as HTMLFormElement | null;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = wrap.querySelector('#email') as any;
    const email = (input && (input.value || '')).trim();
    if (!email || !email.includes('@')) return;
    localStorage.setItem('maker_email', email);
    await fetch('/api/auth/request-access', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    wrap.innerHTML = "<div class='liquid-glass access-card m3-card'><div class='head'><span class='material-symbols-rounded' aria-hidden='true'>check_circle</span><div class='titles'><div class='title'>Request sent</div><div class='support'>Thanks — I'll review and email you soon.</div></div></div></div>";
  });
  // focus
  (wrap.querySelector('#email') as HTMLElement | null)?.focus?.();
  document.documentElement.setAttribute('data-creator','open');
}

async function handlePasskeyClick() {
  const btn = qs<HTMLButtonElement>('#creator-passkey');
  const labelEl = btn?.querySelector('.label') as HTMLSpanElement | null;
  const iconEl = btn?.querySelector('.icon') as HTMLElement | null;
  const origLabel = labelEl?.textContent;
  try {
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    if (labelEl) labelEl.textContent = 'Working…';
    if (iconEl) iconEl.textContent = 'hourglass_top';
  } catch {}
  // If already signed in, this becomes Sign out
  const currentMode = (qs<HTMLButtonElement>('#creator-passkey')?.dataset.mode) || 'signin';
  if (currentMode === 'signout') {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      await refreshAuth();
    } finally {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
      if (labelEl && origLabel) labelEl.textContent = origLabel;
      if (iconEl) iconEl.textContent = 'fingerprint';
    }
    return;
  }
  // Prefer registration first; fallback to sign-in if already enrolled
  try {
    await ensureMaterialWeb();
    // Ask for an email to check approval status. Remember between attempts.
    let email = (localStorage.getItem('maker_email') || '').trim();
    if (!email) { mountAccessUI(); throw new Error('awaiting-email'); }
    const status = await fetch(`/api/auth/approval-status?email=${encodeURIComponent(email)}`, { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ approved: false }));
    if (!status?.approved && (String(import.meta.env.ALLOW_REGISTRATION) !== 'true')) { mountAccessUI(email); throw new Error('not-approved'); }
    await ensureWebAuthn();
    const roRes = await fetch(`/api/auth/registration-options?email=${encodeURIComponent(email)}`, { credentials: 'same-origin' });
    if (roRes.status === 403) throw new Error('registration-closed');
    if (!roRes.ok) throw new Error(`registration-options-failed:${roRes.status}`);
    const ro = await roRes.json();
    const att = await startRegistration(ro);
    const vr = await fetch('/api/auth/verify-registration', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(att) });
    if (!vr.ok) throw new Error(`registration-verify-failed:${vr.status}`);
    await refreshAuth();
    if (location.hostname === 'localhost') {
      location.assign('http://localhost:3333/');
    } else {
      location.assign('https://studio.wenzelarifiandi.com');
    }
    return;
  } catch (regErr) {
    console.warn('[maker] registration flow failed:', regErr);
    try {
      await ensureWebAuthn();
      const optRes = await fetch('/api/auth/authentication-options', { credentials: 'same-origin' });
      if (!optRes.ok) throw new Error(`auth-options-failed:${optRes.status}`);
      const opts = await optRes.json();
      const assn = await startAuthentication(opts);
      const res = await fetch('/api/auth/verify-authentication', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assn) });
      if (!res.ok) throw new Error(`auth-verify-failed:${res.status}`);
      await refreshAuth();
      if (location.hostname === 'localhost') {
        location.assign('http://localhost:3333/');
      } else {
        location.assign('https://studio.wenzelarifiandi.com');
      }
    } catch (err) {
      // Show inline access request if both paths fail
      await ensureMaterialWeb();
      mountAccessUI(localStorage.getItem('maker_email') || '');
      console.error('[maker] auth flow failed:', err);
    }
  }
  finally {
    try {
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
      if (labelEl && origLabel) labelEl.textContent = origLabel;
      if (iconEl) iconEl.textContent = 'fingerprint';
    } catch {}
  }
}

function attachEvents() {
  const passkeyBtn = qs<HTMLButtonElement>('#creator-passkey');
  if (passkeyBtn) passkeyBtn.addEventListener('click', handlePasskeyClick);
  // Prevent maker chip from wrapping: switch to icon-only if it would wrap
  const makerChip = qs<HTMLButtonElement>('#creator-toggle');
  const adjustMakerChip = () => {
    if (!makerChip) return;
    // Heuristic: if width is narrow or text would wrap, use compact
    const willWrap = makerChip.scrollWidth > makerChip.clientWidth + 2;
    const narrow = window.innerWidth < 420;
    if (narrow || willWrap) makerChip.classList.add('compact'); else makerChip.classList.remove('compact');
  };
  if (makerChip) {
    adjustMakerChip();
    window.addEventListener('resize', adjustMakerChip);
  }
}

document.addEventListener('astro:page-load', () => { attachEvents(); refreshAuth(); });
document.addEventListener('DOMContentLoaded', () => { attachEvents(); refreshAuth(); });

// tiny debug helper
// @ts-ignore
(globalThis as any).__maker = { refreshAuth };

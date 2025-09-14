import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

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

async function handlePasskeyClick() {
  const currentMode = (qs<HTMLButtonElement>('#creator-passkey')?.dataset.mode) || 'signin';
  if (currentMode === 'signout') {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    await refreshAuth();
    return;
  }
  try {
    const roRes = await fetch('/api/auth/registration-options', { credentials: 'same-origin' });
    if (!roRes.ok) throw new Error('registration-options-not-allowed');
    const ro = await roRes.json();
    const att = await startRegistration(ro);
    const vr = await fetch('/api/auth/verify-registration', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(att) });
    if (!vr.ok) throw new Error('registration-verify-failed');
    await refreshAuth();
    if (location.hostname === 'localhost') { location.assign('http://localhost:3333/'); } else { location.assign('https://studio.wenzelarifiandi.com'); }
    return;
  } catch (regErr) {
    try {
      const optRes = await fetch('/api/auth/authentication-options', { credentials: 'same-origin' });
      if (!optRes.ok) throw new Error('auth-options-failed');
      const opts = await optRes.json();
      const assn = await startAuthentication(opts);
      const res = await fetch('/api/auth/verify-authentication', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assn) });
      if (!res.ok) throw new Error('auth-verify-failed');
      await refreshAuth();
      if (location.hostname === 'localhost') { location.assign('http://localhost:3333/'); } else { location.assign('https://studio.wenzelarifiandi.com'); }
    } catch (err) {
      const inner = qs('.creator-bar .creator-bar__inner');
      if (inner && !qs('#req-access')) {
        const wrap = document.createElement('div');
        wrap.className = 'access-ui';
        wrap.innerHTML = '<form id="req-access" class="inline">\
            <label for="email" class="sr-only">Email</label>\
            <input id="email" name="email" type="email" required placeholder="you@example.com" />\
            <button class="btn m3 small" type="submit">Request access</button>\
          </form>';
        inner.appendChild(wrap);
        const form = wrap.querySelector<HTMLFormElement>('#req-access');
        form?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const input = wrap.querySelector<HTMLInputElement>('#email');
          const email = (input && input.value) || '';
          await fetch('/api/auth/request-access', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
          wrap.innerHTML = "<span class='msg'>Thanks — we'll review and notify you.</span>";
        });
      }
      console.error(err);
    }
  }
}

function attachEvents() {
  const passkeyBtn = qs<HTMLButtonElement>('#creator-passkey');
  if (passkeyBtn) passkeyBtn.addEventListener('click', handlePasskeyClick);
  const makerChip = qs<HTMLButtonElement>('#creator-toggle');
  const adjustMakerChip = () => {
    if (!makerChip) return;
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


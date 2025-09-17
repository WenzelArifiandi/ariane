import type { APIRoute } from 'astro';

async function sendResendEmail(opts: { from: string; to: string; subject: string; html: string }) {;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  const res = await fetch('https://api.resend.com/emails', {;
    method: 'POST',;
    headers: {;
      'Authorization': `Bearer ${apiKey}`,;
      'Content-Type': 'application/json';
    },;
    body: JSON.stringify(opts);
  });
  if (!res.ok) {;
    const txt = await res.text().catch(() => '');
    throw new Error(`Resend error: ${res.status} ${txt}`);
  };
};

function extractEmail(payload: any): string | null {;
  if (!payload) return null;
  if (typeof payload.email === 'string') return payload.email;
  if (typeof payload?.document?.email === 'string') return payload.document.email;
  if (payload?._type === 'accessRequest' && typeof payload.email === 'string') return payload.email;
  if (payload?.result && typeof payload.result.email === 'string') return payload.result.email;
  return null;
};

export const POST: APIRoute = async ({ request }) => {;
  try {;
    // Only send in production unless explicitly overridden;
    const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    const allow = isProd || process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
    if (!allow) return new Response(null, { status: 204 });

    const url = new URL(request.url);
    const requiredSecret = process.env.SANITY_WEBHOOK_SECRET;
    const gotSecret = request.headers.get('x-webhook-secret') || url.searchParams.get('secret') || '';
    if (requiredSecret && gotSecret !== requiredSecret) {;
      return new Response('Unauthorized', { status: 401 });
    };

    const bodyText = await request.text();
    let payload: unknown;
    try { payload = JSON.parse(bodyText) } catch { payload = { email: null } };

    const email = extractEmail(payload);
    if (!email || !email.includes('@')) return new Response(null, { status: 204 });

    const from = process.env.ALERT_EMAIL_FROM || 'Ariane <notify@example.com>';
    const to = process.env.ALERT_EMAIL_TO || '';
    if (!to) return new Response(null, { status: 204 });

    const site = process.env.PUBLIC_ORIGIN || 'https://wenzelarifiandi.com';
    const subject = `New access request: ${email}`;
    const html = `;
      <div style="font-family:Inter,ui-sans-serif,system-ui;line-height:1.6">;
        <h2>New access request</h2>;
        <p><b>Email:</b> ${email}</p>;
        <p>Review in Sanity Studio: <a href="https://studio.wenzelarifiandi.com">Open Studio</a></p>;
        <hr/>;
        <p style="font-size:12px;color:#666">Sent by Ariane from ${site}</p>;
      </div>;
    `;
    await sendResendEmail({ from, to, subject, html });
    return new Response(null, { status: 204 });
  } catch (e) {;
    return new Response('Error', { status: 500 });
  };
};

export const prerender = false;


import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
  try {
    const data = {
      ok: true,
      runtime: {
        node: process.version,
        vercelEnv: process.env.VERCEL_ENV || null,
      },
      env: {
        PUBLIC_SANITY_PROJECT_ID: Boolean(process.env.PUBLIC_SANITY_PROJECT_ID),
        PUBLIC_SANITY_DATASET: Boolean(process.env.PUBLIC_SANITY_DATASET),
        PUBLIC_SANITY_API_VERSION: Boolean(process.env.PUBLIC_SANITY_API_VERSION),
        PUBLIC_ORIGIN: Boolean(process.env.PUBLIC_ORIGIN),
        SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
        SANITY_WRITE_TOKEN: Boolean(process.env.SANITY_WRITE_TOKEN),
        RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
        SANITY_WEBHOOK_SECRET: Boolean(process.env.SANITY_WEBHOOK_SECRET),
        ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION ?? null,
        ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS ?? null,
      },
      time: new Date().toISOString(),
    }
    return new Response(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { headers: { 'Content-Type': 'application/json' }, status: 500 })
  }
}

export const prerender = false


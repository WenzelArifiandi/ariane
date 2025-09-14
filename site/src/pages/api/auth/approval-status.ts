import type { APIRoute } from 'astro'
import { isApproved } from '../../../lib/sanityServer'

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email') || ''
    const ok = email.includes('@')
    const approved = ok ? await isApproved(email) : false
    return new Response(JSON.stringify({ approved }), { headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ approved: false }), { headers: { 'Content-Type': 'application/json' } })
  }
}

export const prerender = false


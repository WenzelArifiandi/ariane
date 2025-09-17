import type { APIRoute } from 'astro'

// Compatibility endpoint for stale clients that still try to fetch
// `/scripts/maker-client.ts`. The real logic is now bundled.
// Returning an empty JS module avoids a 404 error in the console.
export const GET: APIRoute = async () => {
  return new Response('', {
    status: 200,
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
  })
}

export const prerender = false


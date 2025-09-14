import type { APIRoute } from 'astro';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createAccessRequest } from '../../../lib/sanityServer';

const DATA_DIR = join(process.cwd(), '.data');
const FILE = join(DATA_DIR, 'pending-access.json');

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response('Invalid email', { status: 400 });
    }
    // Prefer Sanity if server token is configured
    try {
      await createAccessRequest(email)
      return new Response(null, { status: 204 })
    } catch {}
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
    let list: string[] = [];
    if (existsSync(FILE)) list = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!list.includes(email)) list.push(email);
    writeFileSync(FILE, JSON.stringify(list, null, 2));
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Bad request', { status: 400 });
  }
};

export const prerender = false;

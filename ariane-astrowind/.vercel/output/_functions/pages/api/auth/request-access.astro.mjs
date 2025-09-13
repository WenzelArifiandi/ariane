import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export { renderers } from '../../../renderers.mjs';

const DATA_DIR = join(process.cwd(), ".data");
const FILE = join(DATA_DIR, "pending-access.json");
const POST = async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response("Invalid email", { status: 400 });
    }
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
    let list = [];
    if (existsSync(FILE)) list = JSON.parse(readFileSync(FILE, "utf8"));
    if (!list.includes(email)) list.push(email);
    writeFileSync(FILE, JSON.stringify(list, null, 2));
    return new Response(null, { status: 204 });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
};
const prerender = false;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

/* eslint-disable no-useless-escape, no-control-regex */
/* eslint-env node */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const ROOT = path.resolve(__dirname, "..", "constellation"); // project root (adjust if script lives elsewhere)
const CONTENT_DIR = path.join(ROOT, "src", "content", "docs");
const GLOB_EXTS = new Set([".md", ".mdx"]);

// tiny yaml helpers (no deps)
function parseYAML(y) {
  const out = {};
  for (const line of y.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2];
      // strip quotes if present
      val = val.replace(/^\"(.*)\"$/, "$1").replace(/^'(.*)'$/, "$1");
      out[key] = val;
    }
  }
  return out;
}

function stringifyYAML(obj) {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    // quote values that have colon or start with special chars
    const needsQuotes = /[:#{}\[\]&*,!?|>%\-@`]/.test(String(v));
    lines.push(`${k}: ${needsQuotes ? JSON.stringify(String(v)) : v}`);
  }
  return lines.join("\n");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (GLOB_EXTS.has(path.extname(p))) out.push(p);
  }
  return out;
}

function stripBOM(buf) {
  // UTF-8 BOM = 0xEF 0xBB 0xBF
  if (
    buf.length >= 3 &&
    buf[0] === 0xef &&
    buf[1] === 0xbb &&
    buf[2] === 0xbf
  ) {
    return buf.slice(3);
  }
  return buf;
}

function firstHeadingAsTitle(markdown) {
  const m = markdown.match(/^\s*#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

function deriveTitleFromFilename(file) {
  const base = path.basename(file, path.extname(file));
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();
}

function firstSentence(markdown) {
  // crude: find first non-empty paragraph and take first sentence
  const text = markdown
    .replace(/```[\s\S]*?```/g, "") // drop code fences
    .replace(/<!--[\s\S]*?-->/g, "") // drop comments
    .replace(/^---[\s\S]*?---\s*/m, ""); // drop any frontmatter
  const para = (text.split(/\r?\n\r?\n/).find((p) => p.trim().length > 0) || "")
    .replace(/\r?\n/g, " ")
    .trim();
  const m = para.match(/^(.{20,240}?[.!?])(\s|$)/);
  return (m ? m[1] : para.slice(0, 160)).trim();
}

function slugFromPath(p) {
  const rel = p.split(CONTENT_DIR)[1] || "";
  return rel
    .replace(/^[/\\]/, "")
    .replace(path.extname(rel), "")
    .replace(/[^\w/.-]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function ensureFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath);
  const buf = stripBOM(raw);
  let s = buf.toString("utf8");

  let existingFM = {};
  let body = s;

  if (s.startsWith("---")) {
    const end = s.indexOf("\n---", 3);
    if (end !== -1) {
      const fmBlock = s.slice(3, end).replace(/^\s+|\s+$/g, "");
      existingFM = parseYAML(fmBlock);
      body = s.slice(end + 4);
    }
  }

  // derive fields only if missing
  const title =
    existingFM.title ||
    firstHeadingAsTitle(body) ||
    deriveTitleFromFilename(filePath);

  const description =
    existingFM.description || firstSentence(body) || `Docs: ${title}`;

  const slug = existingFM.slug || slugFromPath(filePath);

  // sidebar.order: stable, by alpha of filename (best-effort)
  const order = existingFM["sidebar.order"] ?? undefined; // leave undefined to let Starlight order naturally; or compute a number here

  const finalFM = {
    ...existingFM,
    title,
    description,
    slug,
  };

  if (order !== undefined) finalFM["sidebar.order"] = order;

  const yaml = stringifyYAML(finalFM);
  const out = `---\n${yaml}\n---\n\n${body.replace(/^\uFEFF/, "")}`;

  // enforce LF
  const normalized = out.replace(/\r\n/g, "\n");

  // write back only if changed
  if (normalized !== s) {
    fs.writeFileSync(filePath, normalized, "utf8");
    return true;
  }
  return false;
}

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    globalThis.console.error(`Content dir not found: ${CONTENT_DIR}`);
    globalThis.process.exit(1);
  }
  const files = walk(CONTENT_DIR);
  let changed = 0, total = 0;
  for (const f of files) {
    total++;
    try {
      if (ensureFrontmatter(f)) changed++;
    } catch (e) {
      globalThis.console.error(`Error fixing ${f}:`, e.message);
      globalThis.process.exitCode = 1;
    }
  }
  globalThis.console.log(`Processed ${total} file(s). Fixed ${changed}.`);
}

main();

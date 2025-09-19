/* eslint-disable no-undef */
/* eslint-env node */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/content/all");

function niceTitle(fn) {
  return path
    .basename(fn, path.extname(fn))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function extractDescription(txt) {
  // Find first non-empty paragraph after frontmatter
  const body = txt.replace(/^---[\s\S]*?---/, "").trim();
  const match = body.match(/^(.*?)(\n|$)/m);
  if (match && match[1].trim().length > 0) {
    return match[1].trim();
  }
  return "";
}

function needsFM(txt) {
  // frontmatter must start at byte 0 with ---
  return !txt.startsWith("---\\n");
}

function parseFrontmatter(txt) {
  const fmMatch = txt.match(/^---\\n([\s\S]*?)\\n---/);
  if (!fmMatch) return null;
  const fm = {};
  for (const line of fmMatch[1].split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) fm[key.trim()] = rest.join(":").trim();
  }
  return fm;
}

function prependFM(file) {
  const raw = fs.readFileSync(file, "utf8");
  if (!needsFM(raw)) {
    // Already has frontmatter, enhance if needed
    const fm = parseFrontmatter(raw);
    let changed = false;
    let newFM = fm || {};
    if (!newFM.title) {
      newFM.title = niceTitle(file);
      changed = true;
    }
    if (!newFM.description) {
      newFM.description = extractDescription(raw);
      changed = true;
    }
    if (!newFM.sidebar) {
      newFM.sidebar = { label: newFM.title, order: fileOrder(file) };
      changed = true;
    }
    if (changed) {
      // Replace frontmatter block
      const fmBlock =
        "---\\n" +
        Object.entries(newFM)
          .map(([k, v]) =>
            typeof v === "object"
              ? `${k}:\n  label: ${v.label}\n  order: ${v.order}`
              : `${k}: ${v}`
          )
          .join("\n") +
        "\\n---";
      const rest = raw.replace(/^---[\s\S]*?---/, "").trimStart();
      fs.writeFileSync(file, fmBlock + "\n\n" + rest, "utf8");
      return true;
    }
    return false;
  }
  // No frontmatter, add minimal
  const title = niceTitle(file);
  const description = extractDescription(raw);
  const fm = `---` +
`title: ${title}` +
`description: ${description}` +
`sidebar:` +
`  label: ${title}` +
`  order: ${fileOrder(
    file
  )}` +
`---` + "\n\n";
  fs.writeFileSync(file, fm + raw, "utf8");
  return true;
}

function fileOrder(file) {
  // Simple: order by directory depth and filename
  const rel = path.relative(ROOT, file);
  const depth = rel.split(path.sep).length;
  return depth * 100 + niceTitle(file).charCodeAt(0);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(md|mdx)$/i.test(entry.name)) {
      const changed = prependFM(p);
      if (changed) globalThis.console.log("Enhanced FM:", p);
    }
  }
}

if (!fs.existsSync(ROOT)) {
  globalThis.console.error("No src/content/all directory found.");
  globalThis.process.exit(1);
}
walk(ROOT);
globalThis.console.log("Frontmatter enhancement complete.");
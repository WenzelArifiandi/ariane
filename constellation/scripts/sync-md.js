import {
  readdirSync,
  statSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "../../..");
const target = join(__dirname, "../src/content/all");

// Clean out old synced files
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const excludeDirs = [
  "node_modules",
  ".git",
  "constellation",
  "docs-app",
  "dist",
  "build",
  ".vercel",
  ".next",
  ".astro",
];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (excludeDirs.includes(entry)) continue;
    const fullPath = join(dir, entry);
    const relPath = relative(repoRoot, fullPath);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (entry.endsWith(".md")) {
      const dest = join(target, relPath);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(fullPath, dest);
    }
  }
}

walk(repoRoot);
console.log("✅ Synced all markdown to", target);

console.log("✅ Synced all markdown to", target);

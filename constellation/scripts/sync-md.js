/* eslint-disable no-unused-vars, no-useless-escape */
import {
  readdirSync,
  statSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "../../..");
const target = join(__dirname, "../src/content/docs");

// Clean out old synced files
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const excludeDirs = [
  "node_modules",
  ".git",
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
    
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (entry.endsWith(".md") || entry.endsWith(".mdx")) {
      // Flatten: copy all markdown files directly into src/content/docs/
      const dest = join(target, basename(fullPath));
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(fullPath, dest);
    }
  }
}

walk(repoRoot);
globalThis.console.log("\u2705 Synced all markdown to", target);
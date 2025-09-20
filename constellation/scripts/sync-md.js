/* eslint-disable no-unused-vars, no-useless-escape */
import {
  readdirSync,
  statSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "../../..");
const target = join(__dirname, "../src/content/docs");

// Preserve custom index.mdx if it exists
const customIndexPath = join(target, "index.mdx");
let customIndexContent = null;
if (existsSync(customIndexPath)) {
  try {
    customIndexContent = readFileSync(customIndexPath, 'utf8');
    console.log("💾 Preserving custom index.mdx");
  } catch (e) {
    console.log("⚠️  Could not read custom index.mdx");
  }
}

// Clean out old synced files
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

// Restore custom index.mdx if it was preserved
if (customIndexContent) {
  writeFileSync(customIndexPath, customIndexContent, 'utf8');
  console.log("✅ Restored custom index.mdx");
}

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

      // Skip copying index.mdx if it already exists (preserve custom homepage)
      if (basename(fullPath) === "index.mdx" && existsSync(dest)) {
        console.log("⏭️  Skipping index.mdx (preserving custom homepage)");
        continue;
      }

      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(fullPath, dest);

      // Add frontmatter if missing
      const content = readFileSync(dest, 'utf8');
      if (!content.startsWith('---')) {
        const lines = content.split('\n');
        const firstLine = lines[0];
        const title = firstLine.startsWith('#') ? firstLine.slice(1).trim() : basename(fullPath, '.md').replace(/_/g, ' ');
        const slug = basename(fullPath, '.md').toLowerCase();

        const frontmatter = `---
title: "${title}"
description: "${firstLine}"
slug: ${slug}
---

`;
        writeFileSync(dest, frontmatter + content, 'utf8');
      }
    }
  }
}

walk(repoRoot);
globalThis.console.log("\u2705 Synced all markdown to", target);
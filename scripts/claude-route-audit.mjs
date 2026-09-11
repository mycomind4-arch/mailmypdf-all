#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "apps/verticals");
const patterns = [
  /generativelanguage\.googleapis\.com/,
  /resolveGemini/,
  /callGemini/,
  /provider\s*!==\s*["']gemini["']/,
  /provider\s*:\s*["']gemini["']/,
];

function filesUnder(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const rows = [];
for (const vertical of fs.readdirSync(root, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  const files = filesUnder(path.join(root, vertical.name));
  const routes = files.filter((file) => file.includes(`${path.sep}src${path.sep}routes${path.sep}api${path.sep}workflows${path.sep}`));
  const legacy = routes.filter((file) => patterns.some((pattern) => pattern.test(fs.readFileSync(file, "utf8"))));
  rows.push({ vertical: vertical.name, workflowApiRoutes: routes.length, legacyGeminiRoutes: legacy.length, legacyFiles: legacy.map((file) => path.relative(process.cwd(), file)).sort() });
}

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));

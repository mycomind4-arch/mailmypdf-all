#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const verticalRoot = path.join(root, "apps", "verticals");
const verticals = fs.readdirSync(verticalRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const filesUnder = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else result.push(path.relative(root, absolute));
    }
  };
  walk(dir);
  return result;
};

const rows = verticals.map((vertical) => {
  const files = filesUnder(path.join(verticalRoot, vertical));
  const workflowFiles = files.filter((file) => /workflow/i.test(file));
  const apiFiles = files.filter((file) => /(?:routes|api).*workflow/i.test(file));
  const uiFiles = files.filter((file) => /(?:components|routes|app).*workflow/i.test(file));
  const shell = workflowFiles.length <= 2;
  return {
    vertical,
    files: files.length,
    workflowFiles: workflowFiles.length,
    apiFiles: apiFiles.length,
    uiFiles: uiFiles.length,
    disposition: shell ? "SHELL_REQUIRES_REBUILD" : "PARITY_REVIEW_REQUIRED",
  };
});

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));

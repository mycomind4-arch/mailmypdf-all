import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registry = fs.readFileSync(path.join(root, "src/verticals/registry.ts"), "utf8");
const ecosystem = fs.readFileSync(path.join(root, "src/lib/ecosystem.ts"), "utf8");

const canonicalRoutes = {
  "gov-reply": "/govreply",
  "appeal-reply": "/appeal-reply",
  "notice-response": "/notice-response",
  "claim-proof": "/claim-proof",
  "tenant-reply": "/tenant-reply",
  "permit-reply": "/permit-reply",
  "benefits-appeal": "/benefits-appeal",
  "debt-defense": "/debt-defense-mail",
  "records-request": "/records-request",
  "dispute-mail": "/dispute-mail",
};

test("all first-generation verticals have root-level canonical routes", () => {
  for (const [id, route] of Object.entries(canonicalRoutes)) {
    assert.match(registry, new RegExp(`id: "${id}"[\\s\\S]{0,1200}route: "${route.replaceAll("/", "\\/")}"`), `missing canonical route for ${id}`);
  }
  assert.doesNotMatch(registry, /route:\s*"\/solutions\//, "vertical registry must not make /solutions a route namespace");
});

test("BureaucracyOS is not a user-facing ecosystem vertical", () => {
  assert.doesNotMatch(ecosystem, /slug:\s*"bureaucracyos"/i);
  assert.doesNotMatch(ecosystem, /title:\s*"BureaucracyOS"/i);
});

test("solutions compatibility routes point back to canonical verticals", () => {
  const govAlias = fs.readFileSync(path.join(root, "src/routes/solutions/gov-reply.tsx"), "utf8");
  const appealAlias = fs.readFileSync(path.join(root, "src/routes/solutions/appeal-reply.tsx"), "utf8");
  const dynamicAlias = fs.readFileSync(path.join(root, "src/routes/solutions/$verticalSlug.tsx"), "utf8");
  assert.match(govAlias, /redirect\(\{ to: "\/govreply" \}\)/);
  assert.match(appealAlias, /redirect\(\{ to: "\/appeal-reply" \}\)/);
  assert.match(dynamicAlias, /redirect\(\{ to: vertical\?\.route \?\? "\/solutions" \}\)/);
});

test("legacy BureaucracyOS route redirects into the ecosystem", () => {
  const legacy = fs.readFileSync(path.join(root, "src/routes/bureaucracyos.tsx"), "utf8");
  assert.match(legacy, /redirect\(\{ to: "\/products" \}\)/);
  assert.doesNotMatch(legacy, /BureaucracyOS is the operating system/);
});

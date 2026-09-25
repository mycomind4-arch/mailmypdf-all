import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sections = fs.readFileSync(path.join(root, "src/lib/section-registry.ts"), "utf8");
const registry = fs.readFileSync(path.join(root, "src/verticals/registry.ts"), "utf8");
const ecosystem = fs.readFileSync(path.join(root, "src/lib/ecosystem.ts"), "utf8");

const canonicalSections = [
  "appeal-mail",
  "benefits-appeal",
  "claim-proof",
  "code-enforcement",
  "dispute-mail",
  "immigration-mail",
  "insurance-claims",
  "legal-defense",
  "notice-respond",
  "permit-reply",
  "private-office",
  "records-request",
  "secured-transactions",
  "small-business",
  "tenant-reply",
];

test("all canonical sections use exact root-level routes", () => {
  for (const id of canonicalSections) {
    assert.match(
      sections,
      new RegExp(`id: "${id}"[\\s\\S]{0,500}path: "\\/${id}"`),
      `missing canonical route for ${id}`,
    );
  }
  assert.doesNotMatch(sections, /path:\s*"\/solutions\//);
});

test("legacy vertical slugs resolve through compatibility aliases", () => {
  assert.match(sections, /"appeal-reply": "appeal-mail"/);
  assert.match(sections, /"notice-response": "notice-respond"/);
  assert.match(sections, /"debt-defense": "dispute-mail"/);
  assert.match(sections, /"small-business-mail": "small-business"/);
  assert.match(registry, /resolveSectionId/);
});

test("BureaucracyOS is not a user-facing ecosystem vertical", () => {
  assert.doesNotMatch(ecosystem, /slug:\s*"bureaucracyos"/i);
  assert.doesNotMatch(ecosystem, /title:\s*"BureaucracyOS"/i);
});

test("solutions compatibility routes point back to canonical sections", () => {
  const appealAlias = fs.readFileSync(path.join(root, "src/routes/solutions/appeal-reply.tsx"), "utf8");
  const dynamicAlias = fs.readFileSync(path.join(root, "src/routes/solutions/$verticalSlug.tsx"), "utf8");
  assert.match(appealAlias, /redirect\(\{ href: "\/appeal-mail" \}\)/);
  assert.match(dynamicAlias, /redirect\(\{ to: vertical\?\.route \?\? "\/solutions" \}\)/);
});

test("retired BureaucracyOS route is removed", () => {
  assert.equal(fs.existsSync(path.join(root, "src/routes/bureaucracyos.tsx")), false);
});

test("navigation does not send users to legacy deployment domains", () => {
  const navigationSources = [
    "src/lib/section-registry.ts",
    "src/verticals/registry.ts",
    "src/lib/ecosystem.ts",
    "src/lib/workflow-navigation.ts",
    "src/lib/master-public-routes.ts",
    "src/components/ecosystem-shell.tsx",
    "src/components/site-chrome.tsx",
  ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

  assert.doesNotMatch(navigationSources, /(?:appeal-mail|notice-respond|immigration-mail|dispute-mail|benefits-appeal)\.pages\.dev/i);
  assert.doesNotMatch(navigationSources, /mycomind4-arch-mailmypdf-(?:smallbusiness|private-office)\.pages\.dev/i);
});

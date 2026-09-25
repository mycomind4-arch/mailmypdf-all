import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const ecosystem = fs.readFileSync(path.join(root, "src/components/ecosystem-shell.tsx"), "utf8");
const sections = fs.readFileSync(path.join(root, "src/lib/section-registry.ts"), "utf8");
const workflowNavigation = fs.readFileSync(path.join(root, "src/lib/workflow-navigation.ts"), "utf8");

test("public products and authenticated workflow navigation share the canonical section topology", () => {
  const canonicalIds = [...sections.matchAll(/^\s{4}id: "([^"]+)",$/gm)]
    .map((match) => match[1])
    .sort();

  const workflowSectionIds = [...workflowNavigation.matchAll(/^\s{4}"id": "([^"]+)"/gm)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(workflowSectionIds, canonicalIds);
  assert.equal(canonicalIds.length, 15);
  assert.ok(canonicalIds.includes("secured-transactions"));
  assert.match(ecosystem, /import \{ SECTION_REGISTRY \} from "@\/lib\/section-registry"/);
  assert.match(ecosystem, /\.\.\.SECTION_REGISTRY\.map\(\(section\) => \(\{/);
});

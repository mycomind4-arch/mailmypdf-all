import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const ecosystem = fs.readFileSync(path.join(root, "src/components/ecosystem-shell.tsx"), "utf8");
const workflowNavigation = fs.readFileSync(path.join(root, "src/lib/workflow-navigation.ts"), "utf8");

test("public product navigation covers every canonical workflow section", () => {
  const productSlugs = [...ecosystem.matchAll(/slug: "([^"]+)"/g)]
    .map((match) => match[1])
    .filter((slug) => slug !== "mailmypdf")
    .sort();

  const sectionIds = [...workflowNavigation.matchAll(/^\s{4}"id": "([^"]+)"/gm)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(productSlugs, sectionIds);
  assert.equal(sectionIds.length, 15);
  assert.ok(productSlugs.includes("secured-transactions"));
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const registry = read("src/verticals/registry.ts");
const publicConfig = read("src/lib/public-verticals.ts");
const workflowModel = read("../verticals/legal-defense/src/model.ts");
const authority = read("../verticals/legal-defense/src/authority.ts");
const authenticatedRoute = "src/routes/_authenticated/legal-defense/workflows/$workflowId/start.tsx";

test("Legal Defense is a registered executable beta vertical", () => {
  assert.match(registry, /id: "legal-defense"[\s\S]{0,800}status: "beta"/);
  assert.match(registry, /id: "legal-defense"[\s\S]{0,800}executionState: "executable"/);
  assert.match(publicConfig, /"legal-defense"/);
});

test("the first workflow contains the complete nine-step sequence", () => {
  const stepIds = ["case", "timeline", "purchase", "police-basis", "search", "evidence", "seller", "review", "packet"];
  for (const id of stepIds) assert.match(workflowModel, new RegExp(`id: "${id}"`), `missing workflow step: ${id}`);
  assert.equal((workflowModel.match(/id: "(?:case|timeline|purchase|police-basis|search|evidence|seller|review|packet)"/g) ?? []).length, 9);
});

test("workflow execution stays behind the shared authenticated route", () => {
  assert.equal(fs.existsSync(path.join(root, authenticatedRoute)), true);
  assert.equal(fs.existsSync(path.join(root, "src/routes/legal-defense/workflows/$workflowId/start.tsx")), false);
});

test("California legal boundaries cite official sources", () => {
  assert.match(authority, /leginfo\.legislature\.ca\.gov/);
  assert.match(authority, /dmv\.ca\.gov/);
  assert.match(authority, /sectionNum=10851/);
  assert.match(authority, /sectionNum=496d/);
  assert.match(authority, /sectionNum=1538\.5/);
  assert.match(authority, /sectionNum=11364/);
});

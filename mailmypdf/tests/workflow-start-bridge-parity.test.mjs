import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("every canonical executable workflow has an authenticated start bridge", () => {
  const seeds = JSON.parse(read("packages/workflows/src/canonical-workflows.json"));
  const host = read("mailmypdf/src/lib/workflow-start-registry.tsx");
  const entries = [...host.matchAll(/^\s*"([^"]+)":\s*[A-Za-z][A-Za-z0-9_]*,?$/gm)]
    .map((match) => match[1]);
  const declared = seeds.filter((seed) => seed.execution);
  const keys = new Set(entries);
  const expectedKeys = new Set(declared.map((seed) => seed.id.replace("/", ":")));

  assert.equal(keys.size, entries.length, "Duplicate start-bridge mappings are forbidden");
  for (const key of keys) assert.ok(expectedKeys.has(key), "Unregistered start bridge: " + key);

  const omitted = declared.filter((seed) => !keys.has(seed.id.replace("/", ":")));
  assert.deepEqual(omitted.map((seed) => seed.id), ["notice-respond/cp14-response"],
    "Only the factory-verified CP14 Notice Respond start may use the dynamic family bridge");
  assert.match(host, /getNoticeResponseFactoryArtifact\(workflowId\)/);
  assert.match(host, /artifact\?\.factoryReady/);
  assert.match(host, /canonical\.execution\.policyFamily !== "notice-response"/);
});

test("credit bureau start components are shared by public routes and dashboard bridge", () => {
  const host = read("mailmypdf/src/lib/workflow-start-registry.tsx");
  for (const [slug, component, importName] of [
    ["equifax", "EquifaxDisputeStart", "EquifaxDisputeStart"],
    ["experian", "ExperianDisputeStart", "ExperianDisputeStart"],
    ["transunion", "TransUnionDisputeStart", "TransunionDisputeStart"],
  ]) {
    const file = read(`dispute-mail/workflows/${slug}-dispute/start/index.tsx`);
    assert.ok(file.includes(`export function ${component}()`), slug);
    assert.ok(file.includes(`component: ${component}`), slug);
    assert.ok(file.includes(`export default ${component}`), slug);
    assert.ok(host.includes(`"dispute-mail:${slug}-dispute": ${importName}`), slug);
  }
  const route = read("mailmypdf/src/routes/_authenticated/dashboard/workflows/$sectionId/$workflowId/start.tsx");
  assert.match(route, /workflowStartComponent\(sectionId, workflowId\)/);
  assert.match(route, /execution\?\.executionStatus === "executable"/);
});

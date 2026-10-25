import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("authenticated CP14 is mounted through the reviewed Notice Respond factory family", () => {
  const registry = read("mailmypdf/src/lib/workflow-start-registry.tsx");
  const route = read("mailmypdf/src/routes/_authenticated/dashboard/workflows/$sectionId/$workflowId/start.tsx");
  const cp14 = read("notice-respond/workflows/cp14-response/start/index.tsx");
  const seeds = JSON.parse(read("packages/workflows/src/canonical-workflows.json"));
  const canonical = seeds.find((item) => item.id === "notice-respond/cp14-response");
  assert.equal(canonical?.execution?.policyFamily, "notice-response");
  assert.match(registry, /getNoticeResponseFactoryArtifact\(workflowId\)/);
  assert.match(registry, /artifact\?\.factoryReady/);
  assert.match(registry, /artifact\.canonicalId !== canonical\.id/);
  assert.match(registry, /<NoticeResponseWorkflow/);
  assert.match(registry, /canonical\.workspaceHref/);
  assert.match(cp14, /export function Cp14ResponseStart/);
  assert.match(route, /workflowStartComponent\(sectionId, workflowId\)/);
  assert.match(route, /execution\?\.executionStatus === "executable"/);
  assert.doesNotMatch(registry, /apps\/verticals\/[^*]/);
});

test("authenticated Notice Respond starts stay in dashboard and remain non-indexed", () => {
  const detail = read("mailmypdf/src/components/authenticated-workflow-detail.tsx");
  const host = read("mailmypdf/src/routes/_authenticated/dashboard/workflows/$sectionId/$workflowId/start.tsx");
  assert.match(detail, /section\.id === "notice-respond"/);
  assert.match(detail, /workflow\.workspaceHref/);
  assert.match(detail, /this does not certify chat execution, end-to-end acceptance, payment, or physical mailing/);
  assert.match(host, /noindex/);
});

test("factory host does not invent an implementation for unregistered workflows", () => {
  const registry = read("mailmypdf/src/lib/workflow-start-registry.tsx");
  assert.match(registry, /if \(!artifact\?\.factoryReady/);
  assert.match(registry, /return undefined/);
  assert.doesNotMatch(registry, /getNoticeResponseFactoryArtifact\("cp14-response"\)/);
});

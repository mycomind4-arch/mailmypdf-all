import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("CP14 factory gold slice is mounted through the generic Notice Respond family", () => {
  const registry = read("mailmypdf/src/lib/workflow-start-registry.tsx");
  assert.match(registry, /NoticeResponseWorkflow/);
  assert.match(registry, /workflowById/);
  assert.match(registry, /canonical\.execution\.policyFamily === "notice-response"/);
  assert.match(registry, /noticeResponseStartComponent\(workflowId\)/);
  assert.equal(registry.includes("Cp14ResponseStart"), false);
});



test("every canonical executable workflow is covered by a static or factory-family renderer", () => {
  const seeds = JSON.parse(read("packages/workflows/src/canonical-workflows.json"));
  const executable = seeds.filter((seed) => seed.execution);
  const factoryNotice = executable
    .filter(
      (seed) =>
        seed.execution.kind === "platform" &&
        seed.execution.policyFamily === "notice-response",
    )
    .map((seed) => seed.id.replace("/", ":"))
    .sort();
  const expectedStatic = executable
    .filter(
      (seed) =>
        !(
          seed.execution.kind === "platform" &&
          seed.execution.policyFamily === "notice-response"
        ),
    )
    .map((seed) => seed.id.replace("/", ":"))
    .sort();

  const registry = read("mailmypdf/src/lib/workflow-start-registry.tsx");
  const actualStatic = [...registry.matchAll(/^\s*"([^"]+)":\s*[A-Za-z0-9_]+,/gm)]
    .map((match) => match[1])
    .sort();

  assert.equal(executable.length, 30);
  assert.deepEqual(factoryNotice, [
    "notice-respond:cp14-response",
    "notice-respond:cp2000-response",
    "notice-respond:cp504-response",
    "notice-respond:irs-balance-due-notice-response",
    "notice-respond:irs-penalty-notice-response",
  ]);
  assert.deepEqual(actualStatic, expectedStatic);
  assert.equal(new Set(actualStatic).size, actualStatic.length);
});

test("CP14 checked-in landing and start artifacts match the factory topology", () => {
  const landing = read("notice-respond/workflows/cp14-response/index.tsx");
  const config = read("notice-respond/workflows/cp14-response/config.ts");
  const seo = read("notice-respond/workflows/cp14-response/seo.ts");
  const schema = read("notice-respond/workflows/cp14-response/schema.ts");
  const start = read("notice-respond/workflows/cp14-response/start/index.tsx");

  assert.match(
    landing,
    /createFileRoute\("\/notice-respond\/workflows\/cp14-response\/"\)/,
  );
  assert.match(config, /id: "cp14-response"/);
  assert.match(config, /sectionId: "notice-respond"/);
  assert.match(config, /path: "\/notice-respond\/workflows\/cp14-response"/);
  assert.match(
    config,
    /startPath: "\/notice-respond\/workflows\/cp14-response\/start"/,
  );
  assert.match(seo, /createWorkflowHead\(workflowConfig\)/);
  assert.match(schema, /createWorkflowSchema\(workflowConfig\)/);
  assert.match(
    start,
    /createFileRoute\(\s*"\/notice-respond\/workflows\/cp14-response\/start\/"\s*,?\s*\)/s,
  );
  assert.match(start, /workflowId: "cp14-response"/);
  assert.match(start, /NoticeResponseWorkflow/);
});

test("CP14 canonical execution identity is still platform notice-response public-start", () => {
  const seeds = JSON.parse(read("packages/workflows/src/canonical-workflows.json"));
  const cp14 = seeds.find((seed) => seed.id === "notice-respond/cp14-response");
  assert.ok(cp14);
  assert.deepEqual(cp14.execution, {
    kind: "platform",
    entry: "public-start",
    policyFamily: "notice-response",
  });
});

test("CP14 factory artifacts remain free of retired architecture paths", () => {
  const files = [
    "notice-respond/workflows/cp14-response/index.tsx",
    "notice-respond/workflows/cp14-response/config.ts",
    "notice-respond/workflows/cp14-response/seo.ts",
    "notice-respond/workflows/cp14-response/schema.ts",
    "notice-respond/workflows/cp14-response/start/index.tsx",
    "mailmypdf/src/lib/workflow-start-registry.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.equal(source.includes("apps/verticals"), false, file);
    assert.equal(source.includes("apps/mailmypdf"), false, file);
  }
});

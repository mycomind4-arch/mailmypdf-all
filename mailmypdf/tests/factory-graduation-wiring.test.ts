import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildFactoryGraduationReport } from "@mailmypdf/workflows";
import { WORKFLOW_REGISTRY } from "@mailmypdf/workflows/canonical-registry";
import { MAILMYPDF_MCP_TOOLS } from "../src/lib/mcp/tool-catalog";

const repo = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(repo, file), "utf8");

test("live MCP tool catalog supports all three reference journey contracts", () => {
  const names = MAILMYPDF_MCP_TOOLS.map((tool) => tool.name);
  const graduation = buildFactoryGraduationReport(names);
  assert.equal(graduation.summary.total, WORKFLOW_REGISTRY.length);
  assert.equal(graduation.summary.referencesTotal, 3);
  assert.equal(graduation.references.length, 3);
  assert.equal(graduation.summary.referenceContractsReady, 3);
  assert.equal(graduation.summary.awaitingGraduation,
    graduation.summary.total - graduation.summary.chatContractCertified);

  const ids = graduation.references.map((reference) => reference.id);
  assert.deepEqual(ids, ["conversational-letter", "cp14-response", "public-records-request"]);

  for (const reference of graduation.references) {
    assert.equal(reference.contractReady, true, reference.id);
    assert.deepEqual(reference.missingTools, []);
    assert.equal(reference.acceptance, "not-verified-by-this-report");
    assert.equal(reference.liveFulfillment, "not-verified-by-this-report");
    for (const testFile of reference.acceptanceTestPaths) {
      assert.ok(fs.existsSync(path.join(repo, testFile)), "Missing journey acceptance scenario: " + testFile);
    }
  }
});

test("factory queue exposes actionable work without certifying non-runtime catalog entries", () => {
  const names = MAILMYPDF_MCP_TOOLS.map((tool) => tool.name);
  const report = buildFactoryGraduationReport(names);
  assert.equal(new Set(report.queue.map((item) => item.id)).size, report.queue.length);
  for (const item of report.queue) {
    assert.ok(item.nextAction.trim(), "Factory item has no actionable next step: " + item.id);
  }
  assert.equal(
    report.queue.find((item) => item.id === "secured-transactions/secured-transaction-eligibility")?.milestone,
    "connect-domain-runtime",
  );
});

test("factory graduation is admin-only and visible in Studio without claiming a mailing was verified", () => {
  const route = read("mailmypdf/src/routes/api.studio.workflows.readiness.ts");
  const server = read("mailmypdf/src/lib/studio-command-center.functions.ts");
  const ui = read("mailmypdf/src/components/studio-command-center.tsx");
  assert.ok(route.includes("adminFactoryAccessError(request)"));
  assert.ok(route.includes("buildFactoryGraduationReport(toolNames)"));
  assert.ok(server.includes("buildFactoryGraduationReport("));
  assert.ok(ui.includes("Reference journeys &amp; factory graduation"));
  assert.ok(ui.includes("Acceptance unverified · Live fulfillment unverified"));
  assert.ok(ui.includes("journey.nextAcceptance"));
});

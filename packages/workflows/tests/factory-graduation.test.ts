import assert from "node:assert/strict";
import test from "node:test";
import { WORKFLOW_REGISTRY } from "../src/canonical-workflow-registry.js";
import { buildFactoryGraduationReport, REFERENCE_JOURNEYS } from "../src/factory-graduation.js";

const TOOLS = [
  "create_matter", "get_workflow_state", "save_matter_input", "ingest_document", "get_document_status",
  "analyze_matter", "generate_draft", "save_draft", "preview_packet", "approve_packet",
  "prepare_checkout", "get_order_status", "prepare_conversational_letter", "review_direct_pdf_mail",
  "approve_direct_pdf_mail", "get_payment_readiness", "prepare_direct_pdf_checkout", "charge_and_send_direct_pdf_mail",
];

test("factory graduation report distinguishes chat contracts from acceptance and fulfillment", () => {
  const report = buildFactoryGraduationReport(TOOLS);
  assert.equal(report.summary.total, WORKFLOW_REGISTRY.length);
  assert.equal(report.summary.platformRuntimeRegistered, 24);
  assert.equal(report.summary.localIntakes, 6);
  assert.equal(report.summary.chatContractCertified, 23);
  assert.equal(report.summary.awaitingGraduation, report.summary.total - report.summary.chatContractCertified);
  assert.equal(report.summary.referencesTotal, 3);
  assert.equal(report.summary.referenceContractsReady, 3);
  assert.deepEqual(report.references.map((r) => r.id), REFERENCE_JOURNEYS.map((r) => r.id));
  for (const ref of report.references) {
    assert.equal(ref.contractReady, true, ref.id);
    assert.equal(ref.acceptance, "not-verified-by-this-report");
    assert.equal(ref.liveFulfillment, "not-verified-by-this-report");
    assert.ok(ref.acceptanceTestPaths.length > 0);
  }
  assert.equal(report.references[0].contractEvidence, "tool-surface-only");
  assert.equal(report.references[1].contractEvidence, "manifest-chat-certification");
  assert.equal(report.references[2].workspaceHref, "/dashboard/workflows/records-request/public-records-request");
  assert.equal(report.queue.some((entry) => entry.id === "notice-respond/cp14-response"), false);
  assert.equal(report.queue.some((entry) => entry.id === "records-request/public-records-request"), false);
});

test("factory backlog is unique and deterministically ordered without promoting unbound runtimes", () => {
  const report = buildFactoryGraduationReport(TOOLS);
  const queue = report.queue;
  assert.equal(new Set(queue.map((entry) => entry.id)).size, queue.length);
  assert.deepEqual(queue, [...queue].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)));
  const local = queue.find((entry) => entry.id === "secured-transactions/secured-transaction-eligibility");
  assert.equal(local?.milestone, "connect-domain-runtime");
  const catalog = queue.find((entry) => entry.id === "private-office/contractor-dispute");
  if (catalog) assert.equal(catalog.milestone, "build-runtime");
});

test("factory explicitly reports missing connector tools and does not confuse them with acceptance", () => {
  const reduced = TOOLS.filter((tool) => !["approve_packet", "charge_and_send_direct_pdf_mail"].includes(tool));
  const report = buildFactoryGraduationReport(reduced);
  const cp14 = report.references.find((r) => r.id === "cp14-response");
  const ordinary = report.references.find((r) => r.id === "conversational-letter");
  assert.equal(cp14?.contractReady, false);
  assert.ok(cp14?.diagnostics.some((d) => d.code === "CONNECTOR_TOOL_MISSING"));
  assert.equal(ordinary?.contractReady, false);
  assert.deepEqual(ordinary?.missingTools, ["charge_and_send_direct_pdf_mail"]);
  const queued = report.queue.find((q) => q.id === "notice-respond/cp14-response");
  assert.equal(queued?.milestone, "certify-chat-contract");
  assert.equal(queued?.priority, 0);
  assert.equal(cp14?.acceptance, "not-verified-by-this-report");
});

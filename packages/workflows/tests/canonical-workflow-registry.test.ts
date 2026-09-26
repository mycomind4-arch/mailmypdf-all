import assert from "node:assert/strict";
import test from "node:test";
import { buildCanonicalWorkflowRegistry, WORKFLOW_REGISTRY, workflowById, workflowByRuntimeId, type WorkflowSeed } from "../src/canonical-workflow-registry.js";
import { platformWorkflowRuntimePolicyFor } from "../src/platform-runtime-policies.js";
import { INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS, getInsuranceAppealRuntimePolicy } from "../src/domain-packs/appeal/insurance-runtime-policy.js";
import { SSA_RECONSIDERATION_WORKFLOWS, getSsaReconsiderationRuntimePolicy } from "../src/domain-packs/appeal/ssa-reconsideration-runtime-policy.js";
import { IMMIGRATION_COVER_LETTER_WORKFLOW_ID, getImmigrationRuntimePolicy } from "../src/domain-packs/immigration/cover-letter-runtime-policy.js";
import { RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS, getRecordsRequestRuntimePolicy } from "../src/domain-packs/records-request/runtime-policy.js";
import { NOTICE_RESPONSE_WORKFLOW_PROFILES } from "../src/domain-packs/notice-response/profiles.js";
import { getNoticeResponseRuntimePolicy } from "../src/domain-packs/notice-response/runtime-policy.js";

test("every policy implementation has exactly one canonical platform binding, in both directions", () => {
  const families = [
    ["insurance-appeal", INSURANCE_APPEAL_RUNTIME_WORKFLOW_IDS, getInsuranceAppealRuntimePolicy],
    ["ssa-reconsideration", Object.keys(SSA_RECONSIDERATION_WORKFLOWS), getSsaReconsiderationRuntimePolicy],
    ["immigration-cover-letter", [IMMIGRATION_COVER_LETTER_WORKFLOW_ID], getImmigrationRuntimePolicy],
    ["records-request", RECORDS_REQUEST_RUNTIME_WORKFLOW_IDS, getRecordsRequestRuntimePolicy],
    ["notice-response", NOTICE_RESPONSE_WORKFLOW_PROFILES.map((profile) => profile.workflowId), getNoticeResponseRuntimePolicy],
  ] as const;
  for (const [family, ids, provider] of families) {
    const registered = WORKFLOW_REGISTRY.filter((workflow) => workflow.execution?.kind === "platform" && workflow.execution.policyFamily === family);
    assert.deepEqual(registered.map((workflow) => workflow.slug).sort(), [...ids].sort(), family);
    for (const id of ids) {
      assert.ok(workflowByRuntimeId(id));
      assert.equal(platformWorkflowRuntimePolicyFor(id), provider(id), id);
    }
  }
});

test("catalog and local analytical workflows cannot acquire a platform policy", () => {
  assert.equal(workflowById("secured-transactions/secured-transaction-eligibility")?.maturity, "domain-ready");
  for (const workflow of WORKFLOW_REGISTRY.filter((item) => item.execution?.kind !== "platform")) {
    assert.equal(platformWorkflowRuntimePolicyFor(workflow.slug), null, workflow.id);
  }
  assert.equal(platformWorkflowRuntimePolicyFor("unknown"), null);
});

test("authority review does not enable execution; gold copy does not certify maturity", () => {
  const [workflow] = buildCanonicalWorkflowRegistry([{
    id: "test/example", label: "Example", legacyGoldId: "old/example",
    authority: { module: "example", reviewedAt: "2026-09-21" },
  }]);
  assert.equal(workflow.maturity, "source-verified");
  assert.equal(workflow.executionHref, null);
  assert.ok(Object.isFrozen(workflow));
  assert.ok(Object.isFrozen(workflow.authority));
});

test("duplicate, malformed and ambiguous runtime identities fail closed", () => {
  const seed: WorkflowSeed = { id: "one/example", label: "Example", execution: { kind: "platform", entry: "workspace-start", policyFamily: "notice-response" } };
  assert.throws(() => buildCanonicalWorkflowRegistry([seed, seed]), /Duplicate/);
  assert.throws(() => buildCanonicalWorkflowRegistry([seed, { ...seed, id: "two/example" }]), /Ambiguous runtime/);
  assert.throws(() => buildCanonicalWorkflowRegistry([{ ...seed, id: "one/../example" }]), /Invalid canonical/);
  assert.throws(() => buildCanonicalWorkflowRegistry([{ ...seed, authority: { module: "example", reviewedAt: "2026-02-30" } }]), /Invalid authority/);
});

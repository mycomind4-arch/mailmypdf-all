import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSsaReconsiderationRuntimePolicy,
  platformWorkflowRuntimePolicyFor,
  requiredSsaReconsiderationFormKinds,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
} from "../src/index.js";

function analysis(details: Record<string, unknown>): WorkflowMatterAnalysis {
  return {
    version: 1,
    documentId: "notice",
    model: "test",
    createdAt: "2026-09-22T00:00:00Z",
    result: {
      decision: "denied", issuer: "SSA", referenceNumber: null, decisionDate: null, deadline: null,
      confidence: "high", summary: "Denied.", reasons: [], missingInformation: [], suggestedEvidence: [],
      promptInjectionObserved: false, workflowDetails: details,
    },
  } as WorkflowMatterAnalysis;
}

function form(kind: string, overrides: Partial<WorkflowMatterDocument> = {}): WorkflowMatterDocument {
  return {
    documentId: kind, role: "evidence", evidenceKind: kind, included: true, usable: true,
    securityStatus: "clean", position: 1, ...overrides,
  } as WorkflowMatterDocument;
}

const claimant = {
  claimantName: "Pat Doe", claimantAddress: "1 Main St", phone: "555-0100",
  responseMode: "reconsideration", confirmedReconsideration: true, reasonsForDisagreement: "My condition worsened.",
};

test("SSDI and SSI reconsideration are registered in the platform policy registry", () => {
  assert.ok(platformWorkflowRuntimePolicyFor("appeal-ssdi-denial"));
  assert.ok(platformWorkflowRuntimePolicyFor("appeal-ssi-denial"));
  assert.equal(getSsaReconsiderationRuntimePolicy("ssdi-denial"), null);
  assert.equal(getSsaReconsiderationRuntimePolicy("toString"), null);
  assert.throws(() => platformWorkflowRuntimePolicyFor("appeal-ssdi-denial")!.validateMatter({
    workflowId: "appeal-ssdi-denial", verticalId: "benefits-appeal",
  }));
});

test("the appeal level and basis must come from the analysed notice", () => {
  const policy = getSsaReconsiderationRuntimePolicy("appeal-ssdi-denial")!;
  assert.throws(() => policy.validateAnalysis!(analysis({})), /not confirmed/);
  assert.throws(() => policy.validateAnalysis!(analysis({ appealStage: "hearing", decisionBasis: "medical" })), /not hearing/);
  assert.throws(() => policy.validateAnalysis!(analysis({ appealStage: "reconsideration", decisionBasis: "unknown" })), /medical or non-medical/);
  assert.doesNotThrow(() => policy.validateAnalysis!(analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" })));
});

test("the required SSA forms follow the decision basis", () => {
  assert.deepEqual(requiredSsaReconsiderationFormKinds("medical"), ["ssa_561", "ssa_3441", "ssa_827"]);
  assert.deepEqual(requiredSsaReconsiderationFormKinds("nonmedical"), ["ssa_561"]);
  assert.deepEqual(requiredSsaReconsiderationFormKinds("unknown"), []);

  const policy = getSsaReconsiderationRuntimePolicy("appeal-ssi-denial")!;
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  assert.throws(() => policy.validateDocumentsBeforePacket!([form("ssa_561")], medical), /SSA-3441/);
  assert.throws(
    () => policy.validateDocumentsBeforePacket!([form("ssa_561"), form("ssa_3441"), form("ssa_827", { securityStatus: "quarantined" })], medical),
    /SSA-827/,
  );
  assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!([form("ssa_561"), form("ssa_3441"), form("ssa_827")], medical));
});

test("claimant facts are validated per program", () => {
  const ssdi = getSsaReconsiderationRuntimePolicy("appeal-ssdi-denial")!;
  const ssi = getSsaReconsiderationRuntimePolicy("appeal-ssi-denial")!;
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  const matter = {} as never;

  assert.throws(() => ssdi.validateInput({ ...claimant, confirmedReconsideration: false }, nonmedical, matter), /confirm reconsideration/);
  assert.throws(() => ssdi.validateInput(claimant, null, matter), /Analyze the SSDI denial/);
  assert.equal(ssdi.validateInput({ ...claimant, workChanges: "Stopped working." }, nonmedical, matter).workChanges, "Stopped working.");

  assert.throws(() => ssi.validateInput(claimant, nonmedical, matter), /SSI non-medical facts/);
  const saved = ssi.validateInput({ ...claimant, incomeFacts: "No income since May." }, nonmedical, matter);
  assert.equal(saved.incomeFacts, "No income since May.");
  assert.equal("workChanges" in saved, false);
});

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
    documentId: kind, role: "evidence", evidenceKind: kind, mimeType: "application/pdf", included: true, usable: true,
    securityStatus: "clean", position: 1, ...overrides,
  } as WorkflowMatterDocument;
}

import {
  getSsaReconsiderationFactoryArtifact,
} from "../src/domain-packs/appeal/ssa-reconsideration-factory-artifact.js";

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

test("SSA official forms must be clean included PDFs for both SSI and SSDI packets", () => {
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const forms = [form("ssa_561"), form("ssa_3441"), form("ssa_827")];
    assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!(forms, medical));
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { mimeType: "image/jpeg" }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { mimeType: null }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { included: false }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { usable: false }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!([form("ssa_561")], nonmedical));
  }
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


test("SSA chat inputs derive the fixed reconsideration mode without requiring a redundant client field", () => {
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const artifact = getSsaReconsiderationFactoryArtifact(workflowId);
    assert.ok(artifact);
    const fields = artifact.manifest.steps?.flatMap((step) => step.fields ?? []) ?? [];
    assert.equal(fields.some((field) => field.id === "responseMode"), false, workflowId);
    assert.equal(artifact.runtimePolicy.chatContract?.inputFields.some((field) => field.id === "responseMode"), false, workflowId);

    const input = {
      claimantName: "Pat Doe", claimantAddress: "1 Main St", phone: "555-0100",
      confirmedReconsideration: true, reasonsForDisagreement: "I disagree.",
      ...(workflowId === "appeal-ssi-denial" ? { incomeFacts: "No income." } : {}),
    };
    const policy = artifact.runtimePolicy;
    const saved = policy.validateInput(input, nonmedical, {} as never);
    assert.equal(saved.responseMode, "reconsideration", workflowId);
    assert.throws(() => policy.validateInput({ ...input, responseMode: "hearing" }, nonmedical, {} as never), /confirm reconsideration/);
    assert.throws(() => policy.validateInput({ ...input, confirmedReconsideration: false }, nonmedical, {} as never), /confirm reconsideration/);
  }
});

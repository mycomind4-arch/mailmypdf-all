import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowMatterAnalysis, WorkflowMatterDocument } from "@mailmypdf/workflows";
import { ssdiDenialRuntimePolicy } from "../../../appeal-mail/workflows/appeal-ssdi-denial/runtime-policy.ts";

function analysis(
  appealStage: "reconsideration" | "hearing" | "appeals_council" | "unknown",
  decisionBasis: "medical" | "nonmedical" | "unknown",
): WorkflowMatterAnalysis {
  return {
    version: 1,
    documentId: "source-1",
    model: "test-model",
    createdAt: "2026-09-17T00:00:00.000Z",
    result: {
      decision: "Denied",
      issuer: "Social Security Administration",
      referenceNumber: null,
      decisionDate: null,
      deadline: null,
      confidence: "high",
      summary: "The claim was denied.",
      reasons: [],
      missingInformation: [],
      suggestedEvidence: [],
      promptInjectionObserved: false,
      workflowDetails: { appealStage, decisionBasis, responseAddress: null },
    },
  };
}

function document(kind: string): WorkflowMatterDocument {
  return {
    id: `link-${kind}`,
    documentId: `doc-${kind}`,
    role: "evidence",
    evidenceKind: kind,
    pageCount: 1,
    included: true,
    position: 1,
    filename: `${kind}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 100,
    securityStatus: "clean",
    usable: true,
  };
}

const validInput = {
  claimantName: "Test Claimant",
  claimantAddress: "123 Main St, Arcata, CA 95521",
  phone: "707-555-0100",
  representativeName: "",
  responseMode: "reconsideration",
  confirmedReconsideration: true,
  reasonsForDisagreement: "The decision does not reflect the limitations documented in the record.",
  conditionChanges: "",
  newConditions: "",
  treatmentChanges: "",
  medicationChanges: "",
  workChanges: "",
  dailyFunctionChanges: "",
  additionalFacts: "",
  requestedOutcome: "Reconsider the denial.",
};

test("SSDI policy accepts only its canonical new-architecture identity", () => {
  assert.doesNotThrow(() => ssdiDenialRuntimePolicy.validateMatter({
    workflowId: "appeal-ssdi-denial",
    verticalId: "appeal-mail",
  }));
  assert.throws(() => ssdiDenialRuntimePolicy.validateMatter({
    workflowId: "ssdi-denial",
    verticalId: "appeal-mail",
  }), /identity/i);
});

test("SSDI policy fails closed on wrong or unknown appeal level", () => {
  assert.throws(() => ssdiDenialRuntimePolicy.validateAnalysis?.(analysis("hearing", "medical")), /reconsideration/i);
  assert.throws(() => ssdiDenialRuntimePolicy.validateAnalysis?.(analysis("unknown", "medical")), /not confirmed/i);
  assert.throws(() => ssdiDenialRuntimePolicy.validateAnalysis?.(analysis("reconsideration", "unknown")), /medical or non-medical/i);
  assert.doesNotThrow(() => ssdiDenialRuntimePolicy.validateAnalysis?.(analysis("reconsideration", "medical")));
});

test("SSDI policy requires explicit reconsideration confirmation and claimant facts", () => {
  assert.doesNotThrow(() => ssdiDenialRuntimePolicy.validateInput(validInput, analysis("reconsideration", "medical")));
  assert.throws(
    () => ssdiDenialRuntimePolicy.validateInput({ ...validInput, confirmedReconsideration: false }, analysis("reconsideration", "medical")),
    /explicitly confirm/i,
  );
  assert.throws(
    () => ssdiDenialRuntimePolicy.validateInput({ ...validInput, reasonsForDisagreement: "" }, analysis("reconsideration", "medical")),
    /Reasons for disagreement is required/i,
  );
});

test("medical reconsideration requires all three clean official SSA forms", () => {
  const medical = analysis("reconsideration", "medical");
  const forms = [document("ssa_561"), document("ssa_3441"), document("ssa_827")];
  assert.doesNotThrow(() => ssdiDenialRuntimePolicy.validateDocumentsBeforePacket?.(forms, medical));
  assert.throws(
    () => ssdiDenialRuntimePolicy.validateDocumentsBeforePacket?.(forms.slice(0, 2), medical),
    /SSA-827/i,
  );
  assert.throws(
    () => ssdiDenialRuntimePolicy.validateDocumentsBeforePacket?.(
      forms.map((item) => item.evidenceKind === "ssa_3441" ? { ...item, securityStatus: "quarantined", usable: false } : item),
      medical,
    ),
    /SSA-3441/i,
  );
});

test("non-medical reconsideration requires SSA-561 without forcing medical forms", () => {
  const nonmedical = analysis("reconsideration", "nonmedical");
  assert.doesNotThrow(() => ssdiDenialRuntimePolicy.validateDocumentsBeforePacket?.([document("ssa_561")], nonmedical));
  assert.throws(() => ssdiDenialRuntimePolicy.validateDocumentsBeforePacket?.([], nonmedical), /SSA-561/i);
});

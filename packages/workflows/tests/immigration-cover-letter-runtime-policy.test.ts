import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getImmigrationRuntimePolicy,
  platformWorkflowRuntimePolicyFor,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
} from "../src/index.js";

const analysis = {
  version: 1,
  documentId: "filing",
  model: "test",
  createdAt: "2026-09-22T00:00:00Z",
  result: {
    decision: "Form I-485", issuer: "USCIS", referenceNumber: null, decisionDate: null, deadline: null,
    confidence: "high", summary: "Adjustment of status application.", reasons: [], missingInformation: [],
    suggestedEvidence: [], promptInjectionObserved: false, workflowDetails: {},
  },
} as WorkflowMatterAnalysis;

function document(overrides: Partial<WorkflowMatterDocument>): WorkflowMatterDocument {
  return {
    documentId: "filing", role: "subject_notice", evidenceKind: null, included: false, usable: true,
    securityStatus: "clean", position: 0, ...overrides,
  } as WorkflowMatterDocument;
}

const facts = {
  applicantName: "Ana Diaz", filingType: "Adjustment of Status packet", formNumbers: "I-485, I-765",
  filingPurpose: "Apply for permanent residence.",
};

test("the immigration cover letter is registered and bound to its vertical", () => {
  const policy = platformWorkflowRuntimePolicyFor("immigration-filing-cover-letter");
  assert.ok(policy);
  assert.equal(getImmigrationRuntimePolicy("immigration-other"), null);
  assert.doesNotThrow(() => policy.validateMatter({ workflowId: "immigration-filing-cover-letter", verticalId: "immigration-mail" }));
  assert.throws(() => policy.validateMatter({ workflowId: "immigration-filing-cover-letter", verticalId: "appeal-mail" }), /does not match/);
});

test("filing details are confirmed only after analysis and require the core facts", () => {
  const policy = getImmigrationRuntimePolicy("immigration-filing-cover-letter")!;
  const matter = {} as never;
  assert.throws(() => policy.validateInput(facts, null, matter), /Analyze the filing document/);
  assert.throws(() => policy.validateInput({ ...facts, formNumbers: " " }, analysis, matter), /Form number/);
  const saved = policy.validateInput({ ...facts, injected: "x" }, analysis, matter);
  assert.equal(saved.applicantName, "Ana Diaz");
  assert.equal("injected" in saved, false);
});

test("a packet cannot be built unless the filing itself is enclosed", () => {
  const policy = getImmigrationRuntimePolicy("immigration-filing-cover-letter")!;
  const source = document({});
  assert.throws(() => policy.validateDocumentsBeforePacket!([source], analysis), /filing form or application/);
  assert.throws(
    () => policy.validateDocumentsBeforePacket!([source, document({ documentId: "e1", role: "evidence", evidenceKind: "supporting_evidence", included: true, position: 1 })], analysis),
    /filing form or application/,
  );
  assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!(
    [source, document({ documentId: "f1", role: "evidence", evidenceKind: "filing_form", included: true, position: 1 })],
    analysis,
  ));
  assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!([document({ included: true })], analysis));
});

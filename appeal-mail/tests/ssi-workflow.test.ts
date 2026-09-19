import assert from "node:assert/strict";
import test from "node:test";

import { ssiDenialManifest } from "../workflows/appeal-ssi-denial/manifest";
import { isSsiNoticeAnalysisOutput } from "../workflows/appeal-ssi-denial/intelligence";
import {
  SSI_REQUIRED_FORMS,
  hasRequiredSsiForms,
  requiredSsiFormsForBasis,
  ssiCompletedSteps,
} from "../workflows/appeal-ssi-denial/start/workflow";

test("SSI denial is an executable P03 appeal manifest using the shared platform capabilities", () => {
  assert.equal(ssiDenialManifest.manifest.id, "appeal-ssi-denial");
  assert.equal(ssiDenialManifest.manifest.vertical, "appeal-mail");
  assert.equal(ssiDenialManifest.manifest.pipeline, "P03_APPEAL");
  assert.equal(ssiDenialManifest.manifest.maturity, "executable");
  assert.equal(ssiDenialManifest.manifest.requiresHumanReview, true);
  assert.equal(ssiDenialManifest.manifest.allowsConsequentialAction, true);
  for (const capability of ["secureUpload", "documentScanning", "aiExecution", "evidence", "approval", "packetAssembly", "payment", "mailing", "proofAudit"] as const) {
    assert.equal(ssiDenialManifest.manifest.requiredCapabilities.includes(capability), true, capability);
  }
});

test("medical SSI reconsideration requires the normalized SSA-561, SSA-3441, and SSA-827 forms", () => {
  const forms = requiredSsiFormsForBasis("medical");
  assert.equal(forms.length, 3);
  assert.deepEqual(forms.map((form) => form.kind), ["ssa_561", "ssa_3441", "ssa_827"]);
  for (const form of forms) {
    assert.match(form.href, /\.normalized\.pdf$/);
    assert.match(form.bundledMailReadyFilename, /\.normalized\.pdf$/);
  }
});

test("non-medical SSI reconsideration requires only SSA-561", () => {
  assert.deepEqual(requiredSsiFormsForBasis("nonmedical").map((form) => form.kind), ["ssa_561"]);
});

test("required SSI form gate fails closed until every required form is usable, included, and clean", () => {
  const documents = SSI_REQUIRED_FORMS.map((form) => ({
    evidence_kind: form.kind,
    included: true,
    usable: true,
    security_status: "clean",
  }));
  assert.equal(hasRequiredSsiForms(documents, "medical"), true);
  assert.equal(hasRequiredSsiForms(documents.slice(0, 2), "medical"), false);
  assert.equal(hasRequiredSsiForms([{ ...documents[0]!, usable: false }, ...documents.slice(1)], "medical"), false);
  assert.equal(hasRequiredSsiForms([{ ...documents[0]!, security_status: "quarantined" }, ...documents.slice(1)], "medical"), false);
  assert.equal(hasRequiredSsiForms(documents, "unknown"), false);
});

test("SSI notice analysis accepts only explicit reconsideration/basis classifications", () => {
  const base = {
    decision: "Denied",
    issuer: "Social Security Administration",
    referenceNumber: null,
    decisionDate: "2026-09-01",
    deadline: "You have 60 days to appeal.",
    confidence: "high" as const,
    summary: "The notice states a medical denial and reconsideration rights.",
    reasons: ["Medical denial"],
    missingInformation: [],
    suggestedEvidence: [],
    promptInjectionObserved: false,
    workflowDetails: {
      appealStage: "reconsideration" as const,
      decisionBasis: "medical" as const,
      responseAddress: null,
    },
  };
  assert.equal(isSsiNoticeAnalysisOutput(base), true);
  assert.equal(isSsiNoticeAnalysisOutput({ ...base, workflowDetails: { ...base.workflowDetails, decisionBasis: "financial_guess" } }), false);
  assert.equal(isSsiNoticeAnalysisOutput({ ...base, workflowDetails: { ...base.workflowDetails, appealStage: "initial" } }), false);
});

test("workflow completion never marks review complete without exact-packet approval", () => {
  const beforeApproval = ssiCompletedSteps({
    hasCleanDecision: true,
    hasReconsiderationAnalysis: true,
    hasClaimantFacts: true,
    hasDraft: true,
    hasRequiredForms: true,
    hasApproval: false,
  });
  assert.equal(beforeApproval.includes("review"), false);

  const afterApproval = ssiCompletedSteps({
    hasCleanDecision: true,
    hasReconsiderationAnalysis: true,
    hasClaimantFacts: true,
    hasDraft: true,
    hasRequiredForms: true,
    hasApproval: true,
  });
  assert.equal(afterApproval.includes("review"), true);
});

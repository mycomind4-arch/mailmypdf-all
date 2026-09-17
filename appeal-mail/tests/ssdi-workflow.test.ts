import assert from "node:assert/strict";
import test from "node:test";

import {
  SSDI_REQUIRED_FORMS,
  hasRequiredSsdiForms,
  requiredSsdiFormsForBasis,
  ssdiCompletedSteps,
} from "../workflows/appeal-ssdi-denial/start/workflow";

test("medical reconsideration requires all three normalized SSA forms", () => {
  const forms = requiredSsdiFormsForBasis("medical");
  assert.equal(forms.length, 3);
  assert.deepEqual(forms.map((form) => form.kind), ["ssa_561", "ssa_3441", "ssa_827"]);
  for (const form of forms) {
    assert.match(form.href, /\.normalized\.pdf$/);
    assert.match(form.bundledMailReadyFilename, /\.normalized\.pdf$/);
  }
});

test("non-medical reconsideration requires only SSA-561", () => {
  assert.deepEqual(requiredSsdiFormsForBasis("nonmedical").map((form) => form.kind), ["ssa_561"]);
});

test("required form gate fails closed until every required form is usable and included", () => {
  const documents = SSDI_REQUIRED_FORMS.map((form) => ({
    evidence_kind: form.kind,
    included: true,
    usable: true,
    security_status: "clean",
  }));
  assert.equal(hasRequiredSsdiForms(documents, "medical"), true);
  assert.equal(hasRequiredSsdiForms(documents.slice(0, 2), "medical"), false);
  assert.equal(hasRequiredSsdiForms([{ ...documents[0]!, usable: false }, ...documents.slice(1)], "medical"), false);
  assert.equal(hasRequiredSsdiForms([{ ...documents[0]!, security_status: "quarantined" }, ...documents.slice(1)], "medical"), false);
});

test("workflow completion never marks review complete without approval", () => {
  const beforeApproval = ssdiCompletedSteps({
    hasCleanDecision: true,
    hasReconsiderationAnalysis: true,
    hasClaimantFacts: true,
    hasDraft: true,
    hasRequiredForms: true,
    hasApproval: false,
  });
  assert.equal(beforeApproval.includes("review"), false);

  const afterApproval = ssdiCompletedSteps({
    hasCleanDecision: true,
    hasReconsiderationAnalysis: true,
    hasClaimantFacts: true,
    hasDraft: true,
    hasRequiredForms: true,
    hasApproval: true,
  });
  assert.equal(afterApproval.includes("review"), true);
});

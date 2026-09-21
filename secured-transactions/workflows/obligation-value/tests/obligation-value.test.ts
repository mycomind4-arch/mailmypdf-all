import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assessValueEvidence } from "../rules/obligation-value";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";
import { assessObligationValue } from "../rules/assessment";

describe("Obligation & Value workflow", () => {
  test("an unsourced assertion cannot become supported value evidence", () => {
    const result = assessValueEvidence([
      { id: "unsourced", kind: "other", effect: "supports", sourceRefs: [] },
    ]);
    assert.notEqual(result.status, "supported");
  });

  test("the workflow remains non-consequential while its legal rule layer is incomplete", () => {
    assert.equal(workflowManifest.manifest.maturity, "wired");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, true);
  });

  test("the workflow adapter preserves a source-backed obligation and value assessment", () => {
    const result = assessObligationValue({
      obligationId: "obligation-1",
      creditor: "creditor-1",
      obligor: "obligor-1",
      obligationType: "loan",
      principalAmount: 5000,
      currency: "USD",
      valueKind: "money-advanced",
      sourceId: "signed-agreement-1",
      sourceType: "executed-contract",
      valueEffect: "supports",
    });

    assert.equal(result.status, "ready-for-further-analysis");
    assert.equal(result.legalValueDetermined, false);
    assert.equal(result.valueEvidence.status, "supported");
  });

  test("missing source provenance blocks the assessment", () => {
    const result = assessObligationValue({
      obligationId: "obligation-1",
      creditor: "creditor-1",
      obligor: "obligor-1",
      obligationType: "loan",
      valueKind: "money-advanced",
      sourceId: "",
      sourceType: "executed-contract",
      valueEffect: "supports",
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.canProceedToFurtherAnalysis, false);
  });
});

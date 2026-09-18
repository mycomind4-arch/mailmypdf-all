import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assessObligationAndValue,
  assessValueEvidence,
} from "../src/obligations/index.js";

const agreement = {
  id: "agreement",
  sourceType: "executed-contract" as const,
  provenanceLevel: "document_extracted" as const,
};

describe("obligation and value assessment", () => {
  test("reuses obligation resolution and keeps legal value determination separate", () => {
    const result = assessObligationAndValue({
      obligationId: "obligation-1",
      requiredObligationFields: ["creditor-entity-id", "obligor-entity-id", "obligation-type"],
      obligationClaims: [
        { id: "creditor", obligationId: "obligation-1", field: "creditor-entity-id", value: "creditor-1", effect: "supports", source: agreement },
        { id: "obligor", obligationId: "obligation-1", field: "obligor-entity-id", value: "obligor-1", effect: "supports", source: agreement },
        { id: "type", obligationId: "obligation-1", field: "obligation-type", value: "loan", effect: "supports", source: agreement },
      ],
      valueClaims: [
        { id: "advance", kind: "money-advanced", effect: "supports", sourceRefs: ["bank-record-1"], amount: 5000, currency: "USD" },
      ],
    });

    assert.equal(result.status, "ready-for-further-analysis");
    assert.equal(result.legalValueDetermined, false);
    assert.equal(result.obligation.disposition, "resolved");
    assert.equal(result.valueEvidence.status, "supported");
  });

  test("blocks when required obligation fields remain unresolved", () => {
    const result = assessObligationAndValue({
      obligationId: "obligation-1",
      requiredObligationFields: ["creditor-entity-id", "obligor-entity-id", "obligation-type"],
      obligationClaims: [
        { id: "type", obligationId: "obligation-1", field: "obligation-type", value: "loan", effect: "supports", source: agreement },
      ],
      valueClaims: [
        { id: "advance", kind: "money-advanced", effect: "supports", sourceRefs: ["bank-record-1"] },
      ],
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.canProceedToFurtherAnalysis, false);
  });

  test("requires review when value evidence conflicts", () => {
    const result = assessValueEvidence([
      { id: "support", kind: "money-advanced", effect: "supports", sourceRefs: ["record-a"] },
      { id: "contradict", kind: "money-advanced", effect: "contradicts", sourceRefs: ["record-b"] },
    ]);
    assert.equal(result.status, "human-review-required");
    assert.equal(result.requiresHumanReview, true);
  });

  test("does not accept unsupported value assertions without source provenance", () => {
    const result = assessValueEvidence([
      { id: "claim", kind: "other", effect: "supports", sourceRefs: [] },
    ]);
    assert.equal(result.status, "human-review-required");
  });
});

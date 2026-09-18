import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  evaluateSecuredTransactionEligibility,
  type SecuredTransactionEligibilityInput,
} from "../src/eligibility/index.js";

function completeInput(): SecuredTransactionEligibilityInput {
  return Object.fromEntries(
    SECURED_TRANSACTION_ELIGIBILITY_GATES.map((id) => [
      id,
      { status: "verified", sourceRefs: [`source:${id}`] },
    ]),
  ) as SecuredTransactionEligibilityInput;
}

describe("secured-transaction eligibility", () => {
  test("becomes ready for deeper analysis only when every required gate is verified", () => {
    const result = evaluateSecuredTransactionEligibility(completeInput());
    assert.equal(result.status, "ready-for-analysis");
    assert.equal(result.canProceedToAnalysis, true);
    assert.equal(result.missing.length, 0);
    assert.equal(result.contradicted.length, 0);
  });

  test("never authorizes a consequential action", () => {
    const result = evaluateSecuredTransactionEligibility(completeInput());
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("fails closed when a required element is missing", () => {
    const input = completeInput();
    delete input["actual-obligation"];
    const result = evaluateSecuredTransactionEligibility(input);
    assert.equal(result.status, "blocked");
    assert.equal(result.canProceedToAnalysis, false);
    assert.ok(result.missing.includes("actual-obligation"));
  });

  test("does not accept a verified flag without provenance", () => {
    const input = completeInput();
    input.authorization = { status: "verified", sourceRefs: [] };
    const result = evaluateSecuredTransactionEligibility(input);
    assert.equal(result.status, "blocked");
    assert.ok(result.missing.includes("authorization"));
  });

  test("routes contradicted material evidence to human review", () => {
    const input = completeInput();
    input["debtor-rights-in-collateral"] = {
      status: "contradicted",
      sourceRefs: ["title-record", "user-statement"],
      note: "The records conflict about ownership or rights in the proposed collateral.",
    };
    const result = evaluateSecuredTransactionEligibility(input);
    assert.equal(result.status, "human-review-required");
    assert.equal(result.requiresHumanReview, true);
    assert.ok(result.contradicted.includes("debtor-rights-in-collateral"));
  });
});

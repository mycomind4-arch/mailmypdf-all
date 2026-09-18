import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  evaluateSecuredTransactionEligibility,
} from "../rules/eligibility";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Secured-Transaction Eligibility workflow", () => {
  test("shares the canonical nine fail-closed gates", () => {
    assert.equal(SECURED_TRANSACTION_ELIGIBILITY_GATES.length, 9);
  });

  test("blocks an empty matter rather than inferring a transaction", () => {
    const result = evaluateSecuredTransactionEligibility({});
    assert.equal(result.status, "blocked");
    assert.equal(result.verified.length, 0);
    assert.equal(result.missing.length, 9);
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("remains a non-executable placeholder at the workflow boundary", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

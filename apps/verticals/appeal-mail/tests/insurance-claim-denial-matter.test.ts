import test from "node:test";
import assert from "node:assert/strict";
import { insuranceClaimDenialStepWorkflow } from "../src/domain/step-workflows/insurance-claim-denial";

test("insurance claim denial uses a custom matter journey", () => {
  assert.deepEqual(insuranceClaimDenialStepWorkflow.steps.map((step) => step.id), [
    "intake", "documents", "analysis", "evidence", "payment", "review", "mail",
  ]);
  assert.equal(insuranceClaimDenialStepWorkflow.requiresApprovalBeforeStep, "mail");
});

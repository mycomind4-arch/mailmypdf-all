import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SECURED_TRANSACTION_ELIGIBILITY_GATES,
  evaluateSecuredTransactionEligibility,
} from "../rules/eligibility";
import {
  workflowRuntimePolicy,
  validateSecuredTransactionEligibilityInput,
  toEngineInput,
} from "../runtime-policy";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";
import { allRequiredElementsVerified } from "../fixtures/all-required-elements-verified";
import { oneRequiredElementMissing } from "../fixtures/one-required-element-missing";
import { oneRequiredElementContradicted } from "../fixtures/one-required-element-contradicted";
import { multipleUnresolvedElements } from "../fixtures/multiple-unresolved-elements";

/**
 * These tests exercise the workflow adapter/runtime path -- raw intake
 * object -> workflowRuntimePolicy.validateInput -> toEngineInput -> the
 * shared evaluateSecuredTransactionEligibility engine -- not just the
 * shared engine called in isolation.
 */
function runThroughWorkflow(rawInput: Record<string, unknown>) {
  const validated = validateSecuredTransactionEligibilityInput(rawInput);
  return evaluateSecuredTransactionEligibility(toEngineInput(validated));
}

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

  test("is wired (real rules/UI/persistence/tests), still never allows a consequential action", () => {
    assert.equal(workflowManifest.manifest.maturity, "wired");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, true);
  });

  test("verified 9/9 through the runtime path produces the engine's continue/readiness result", () => {
    const result = runThroughWorkflow(allRequiredElementsVerified);
    assert.equal(result.status, "ready-for-analysis");
    assert.equal(result.verified.length, 9);
    assert.equal(result.missing.length, 0);
    assert.equal(result.contradicted.length, 0);
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("one missing required element cannot continue", () => {
    const result = runThroughWorkflow(oneRequiredElementMissing);
    assert.equal(result.status, "blocked");
    assert.ok(result.missing.includes("actual-value"));
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("contradicted evidence cannot silently pass and surfaces human review", () => {
    const result = runThroughWorkflow(oneRequiredElementContradicted);
    assert.equal(result.status, "human-review-required");
    assert.ok(result.contradicted.includes("debtor-rights-in-collateral"));
    assert.equal(result.requiresHumanReview, true);
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("unresolved evidence surfaces human review where the engine specifies it, without hiding which elements", () => {
    const result = runThroughWorkflow(multipleUnresolvedElements);
    assert.equal(result.status, "blocked");
    assert.ok(result.missing.includes("actual-obligation"));
    assert.ok(result.missing.includes("correct-jurisdiction"));
    assert.equal(result.canProceedToConsequentialAction, false);
  });

  test("runtime validation rejects malformed gate evidence rather than defaulting it to verified", () => {
    assert.throws(() =>
      validateSecuredTransactionEligibilityInput({
        "identifiable-debtor": { status: "definitely-true" },
      }),
    );
  });

  test("runtime validation rejects unrecognized fields rather than silently accepting them", () => {
    assert.throws(() =>
      validateSecuredTransactionEligibilityInput({
        "not-a-real-gate": { status: "verified", sources: [{ kind: "document", id: "doc-1", label: "Doc" }] },
      }),
    );
  });

  test("runtime validation rejects an unsupported evidence source kind", () => {
    assert.throws(() =>
      validateSecuredTransactionEligibilityInput({
        "identifiable-debtor": {
          status: "verified",
          sources: [{ kind: "hearsay", id: "x", label: "x" }],
        },
      }),
    );
  });

  test("a user-confirmed fact stays user-confirmed and is never relabeled as document/registry evidence", () => {
    const validated = validateSecuredTransactionEligibilityInput({
      "identifiable-debtor": {
        status: "verified",
        sources: [{ kind: "user-confirmed", id: "user-stmt-1", label: "User confirmation" }],
      },
    });
    assert.equal(validated["identifiable-debtor"]?.sources[0]?.kind, "user-confirmed");
  });

  test("no result claims attachment, perfection, or priority", () => {
    const result = runThroughWorkflow(allRequiredElementsVerified);
    assert.equal("attachmentLegallyDetermined" in result, false);
    assert.equal("perfectionLegallyDetermined" in result, false);
    assert.equal("priorityLegallyDetermined" in result, false);
  });

  test("runtime policy identifies this workflow and requires no source document", () => {
    assert.doesNotThrow(() =>
      workflowRuntimePolicy.validateMatter({
        workflowId: "secured-transaction-eligibility",
        verticalId: "secured-transactions",
      }),
    );
    assert.throws(() =>
      workflowRuntimePolicy.validateMatter({
        workflowId: "some-other-workflow",
        verticalId: "secured-transactions",
      }),
    );
    assert.equal(workflowRuntimePolicy.requiresSourceDocument, false);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES,
  SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES,
  securedTransactionCapabilities,
} from "./manifest-base";

describe("secured-transaction capability composition", () => {
  test("the base aggregate matches the original 18-capability set exactly", () => {
    const expected = [
      "identity",
      "matterState",
      "security",
      "classification",
      "extraction",
      "provenance",
      "facts",
      "findings",
      "requirements",
      "evidence",
      "research",
      "risk",
      "strategy",
      "validation",
      "blockingGate",
      "humanReview",
      "approval",
      "proofAudit",
    ];
    assert.deepEqual(
      [...SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES].sort(),
      [...expected].sort(),
    );
  });

  test("composing no groups yields an empty, deterministic list", () => {
    assert.deepEqual(securedTransactionCapabilities({}), []);
  });

  test("composing overlapping groups deduplicates", () => {
    const result = securedTransactionCapabilities({ matterState: true, findings: true, validation: true });
    assert.equal(new Set(result).size, result.length);
    assert.ok(result.includes("matterState"));
    assert.ok(result.includes("findings"));
    assert.ok(result.includes("requirements"));
    assert.ok(result.includes("validation"));
    assert.ok(result.includes("blockingGate"));
  });

  test("composition never includes an unselected group's capabilities", () => {
    const result = securedTransactionCapabilities({ matterState: true });
    assert.deepEqual(result, ["matterState"]);
    assert.ok(!result.includes("approval"));
    assert.ok(!result.includes("proofAudit"));
  });

  test("is deterministic across repeated calls with the same selection", () => {
    const a = securedTransactionCapabilities({ evidence: true, humanReview: true });
    const b = securedTransactionCapabilities({ evidence: true, humanReview: true });
    assert.deepEqual(a, b);
  });

  test("the truthful eligibility composition (matterState, findings, validation, humanReview) is available for use once the pipeline-registry blocker is resolved", () => {
    assert.deepEqual(
      [...SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES].sort(),
      ["blockingGate", "findings", "humanReview", "matterState", "requirements", "validation"].sort(),
    );
    assert.ok(!SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES.includes("identity"));
    assert.ok(!SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES.includes("provenance"));
    assert.ok(!SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES.includes("approval"));
    assert.ok(!SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES.includes("proofAudit"));
  });

  test("the eligibility manifest declares its truthful narrow capability set", async () => {
    const { default: workflowManifest } = await import("../../workflows/secured-transaction-eligibility/manifest");
    assert.deepEqual(
      [...workflowManifest.manifest.requiredCapabilities].sort(),
      [...SECURED_TRANSACTION_ELIGIBILITY_REQUIRED_CAPABILITIES].sort(),
    );
    assert.notDeepEqual(
      [...workflowManifest.manifest.requiredCapabilities].sort(),
      [...SECURED_TRANSACTION_BASE_REQUIRED_CAPABILITIES].sort(),
    );
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createSecuredTransactionFinding,
  isEvidenceReadySecuredTransactionFinding,
} from "../src/findings/index.js";
import {
  certifySecuredTransactionMatter,
} from "../src/certification/index.js";

const source = {
  id: "source-1",
  kind: "document" as const,
  label: "Synthetic source",
};

describe("secured-transaction findings and certification", () => {
  test("verified findings require provenance", () => {
    assert.throws(() =>
      createSecuredTransactionFinding({
        id: "finding-1",
        status: "verified",
        sourceRefs: [],
      }),
    );
  });

  test("non-verified findings require explicit reason codes", () => {
    assert.throws(() =>
      createSecuredTransactionFinding({
        id: "finding-1",
        status: "unresolved",
      }),
    );
  });

  test("only verified, sourced, non-review findings are evidence-ready", () => {
    const finding = createSecuredTransactionFinding({
      id: "finding-1",
      status: "verified",
      sourceRefs: [source],
    });
    assert.equal(isEvidenceReadySecuredTransactionFinding(finding), true);
  });

  test("matter certification blocks missing required findings", () => {
    const result = certifySecuredTransactionMatter({
      findings: [],
      requiredFindingIds: ["debtor", "obligation"],
    });
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.missingFindingIds, ["debtor", "obligation"]);
  });

  test("matter certification routes unresolved findings to review", () => {
    const result = certifySecuredTransactionMatter({
      findings: [
        createSecuredTransactionFinding({
          id: "debtor",
          status: "verified",
          sourceRefs: [source],
        }),
        createSecuredTransactionFinding({
          id: "obligation",
          status: "unresolved",
          reasonCodes: ["conflicting-records"],
          sourceRefs: [source],
        }),
      ],
      requiredFindingIds: ["debtor", "obligation"],
    });
    assert.equal(result.status, "human-review-required");
    assert.equal(result.canProceedToNextWorkflow, false);
  });

  test("generic matter certification never authorizes a consequential action", () => {
    const result = certifySecuredTransactionMatter({
      findings: [
        createSecuredTransactionFinding({
          id: "debtor",
          status: "verified",
          sourceRefs: [source],
        }),
      ],
      requiredFindingIds: ["debtor"],
    });
    assert.equal(result.status, "ready-for-next-workflow");
    assert.equal(result.canProceedToConsequentialAction, false);
  });
});

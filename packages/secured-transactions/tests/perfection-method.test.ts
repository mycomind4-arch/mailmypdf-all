import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  selectPerfectionMethod,
} from "../src/perfection/index.js";

const baseRule = {
  status: "resolved" as const,
  jurisdiction: "TEST-1",
  ruleId: "synthetic",
  authorityRefs: [{
    id: "authority",
    title: "Synthetic authority",
    jurisdiction: "TEST-1",
  }],
  reasonCodes: [],
  requiresHumanReview: false,
};

describe("perfection method selection", () => {
  test("does not guess when jurisdiction coverage is unsupported", () => {
    const result = selectPerfectionMethod({
      rule: {
        status: "unsupported",
        jurisdiction: "TEST-1",
        authorityRefs: [],
        reasonCodes: ["no-active-supported-rule-pack"],
        requiresHumanReview: false,
      },
    });
    assert.equal(result.status, "unsupported");
    assert.equal(result.selectedMethod, undefined);
  });

  test("selects a requested method only if the resolved rule pack permits it", () => {
    const result = selectPerfectionMethod({
      requestedMethod: "control",
      rule: {
        ...baseRule,
        value: {
          collateralClass: "synthetic",
          allowedMethods: ["filing", "control"],
        },
      },
    });
    assert.equal(result.status, "selected");
    assert.equal(result.selectedMethod, "control");
    assert.equal(result.legalSufficiencyDetermined, false);
  });

  test("blocks a requested method not supported by the resolved pack", () => {
    const result = selectPerfectionMethod({
      requestedMethod: "possession",
      rule: {
        ...baseRule,
        value: {
          collateralClass: "synthetic",
          allowedMethods: ["filing"],
        },
      },
    });
    assert.equal(result.status, "blocked");
  });

  test("requires review when multiple methods remain available and none is selected", () => {
    const result = selectPerfectionMethod({
      rule: {
        ...baseRule,
        value: {
          collateralClass: "synthetic",
          allowedMethods: ["filing", "control"],
        },
      },
    });
    assert.equal(result.status, "human-review-required");
  });
});

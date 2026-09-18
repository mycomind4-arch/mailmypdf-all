import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { selectPerfectionMethod } from "../rules/perfection-method";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Perfection Method Selection workflow", () => {
  test("does not guess a method without supported rule coverage", () => {
    const result = selectPerfectionMethod({
      rule: {
        status: "unsupported",
        jurisdiction: "UNSUPPORTED",
        authorityRefs: [],
        reasonCodes: ["no-active-supported-rule-pack"],
        requiresHumanReview: false,
      },
    });
    assert.equal(result.status, "unsupported");
  });

  test("remains non-executable at the workflow boundary", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

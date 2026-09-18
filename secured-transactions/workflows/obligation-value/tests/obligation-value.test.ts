import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assessValueEvidence } from "../rules/obligation-value";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Obligation & Value workflow", () => {
  test("an unsourced assertion cannot become supported value evidence", () => {
    const result = assessValueEvidence([
      { id: "unsourced", kind: "other", effect: "supports", sourceRefs: [] },
    ]);
    assert.notEqual(result.status, "supported");
  });

  test("the workflow remains non-consequential while its legal rule layer is incomplete", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

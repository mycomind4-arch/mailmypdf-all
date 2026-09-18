import assert from "node:assert/strict";
import { describe, test } from "node:test";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Amendment / Continuation / Assignment / Termination workflow", () => {
  test("lifecycle workflow remains review-only", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

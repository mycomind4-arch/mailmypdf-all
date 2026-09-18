import assert from "node:assert/strict";
import { describe, test } from "node:test";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Post-Perfection Verification workflow", () => {
  test("verification workflow remains an evidence review boundary", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

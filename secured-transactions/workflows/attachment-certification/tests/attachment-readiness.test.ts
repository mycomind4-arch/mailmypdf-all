import assert from "node:assert/strict";
import { describe, test } from "node:test";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Attachment Certification workflow boundary", () => {
  test("the current workflow does not claim legal attachment", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

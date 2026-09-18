import assert from "node:assert/strict";
import { describe, test } from "node:test";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("First-Priority Determination workflow boundary", () => {
  test("the placeholder cannot claim first priority", () => {
    assert.equal(workflowManifest.manifest.maturity, "placeholder");
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

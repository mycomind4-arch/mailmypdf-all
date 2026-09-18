import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createJurisdictionRuleRegistry,
} from "@mailmypdf/jurisdiction-rules";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Governing Law & Filing Jurisdiction workflow", () => {
  test("unsupported jurisdiction coverage stays unsupported", () => {
    const registry = createJurisdictionRuleRegistry([]);
    const result = registry.resolve({
      family: "ucc-filing-location",
      jurisdiction: "UNSUPPORTED",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
  });

  test("the workflow cannot execute a consequential action while rule coverage is incomplete", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});

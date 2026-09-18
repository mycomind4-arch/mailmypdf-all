import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createJurisdictionRuleRegistry } from "../src/registry.js";
import { resolveUccLifecycleRule } from "../src/ucc/lifecycle/index.js";

describe("UCC lifecycle rule contract", () => {
  test("returns unsupported without a versioned authority-backed pack", () => {
    const result = resolveUccLifecycleRule({
      registry: createJurisdictionRuleRegistry([]),
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
  });
});

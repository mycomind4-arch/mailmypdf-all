import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createJurisdictionRuleRegistry } from "../src/registry.js";
import { resolveUccPriorityRule } from "../src/ucc/priority/index.js";

describe("UCC priority rule contract", () => {
  test("returns unsupported without an authority-backed pack", () => {
    const result = resolveUccPriorityRule({
      registry: createJurisdictionRuleRegistry([]),
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
  });
});

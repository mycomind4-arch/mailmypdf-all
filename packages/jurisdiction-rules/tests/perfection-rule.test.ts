import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createJurisdictionRuleRegistry,
} from "../src/registry.js";
import {
  resolveUccPerfectionRule,
} from "../src/ucc/perfection/index.js";

describe("UCC perfection rule contract", () => {
  test("returns unsupported when no authority-backed pack exists", () => {
    const registry = createJurisdictionRuleRegistry([]);
    const result = resolveUccPerfectionRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
  });

  test("resolves synthetic rule data only through the versioned registry", () => {
    const registry = createJurisdictionRuleRegistry([{
      id: "synthetic-perfection-v1",
      family: "ucc-perfection",
      jurisdiction: "TEST-1",
      status: "active",
      effectiveFrom: "2026-01-01",
      authorityRefs: [{
        id: "test-authority",
        title: "Synthetic authority",
        jurisdiction: "TEST-1",
        sourceUri: "test://authority",
      }],
      value: {
        collateralClass: "synthetic-collateral",
        allowedMethods: ["filing", "control"],
      },
    }]);
    const result = resolveUccPerfectionRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "resolved");
    assert.deepEqual(result.value?.allowedMethods, ["filing", "control"]);
  });
});

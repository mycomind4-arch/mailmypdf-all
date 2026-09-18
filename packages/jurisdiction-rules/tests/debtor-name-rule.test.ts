import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createJurisdictionRuleRegistry } from "../src/registry.js";
import { resolveUccDebtorNameRule } from "../src/ucc/debtor-name/index.js";

describe("UCC debtor-name rule contract", () => {
  test("unsupported coverage remains unsupported", () => {
    const result = resolveUccDebtorNameRule({
      registry: createJurisdictionRuleRegistry([]),
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
  });

  test("synthetic debtor-name rule resolves only through authority-backed registry data", () => {
    const registry = createJurisdictionRuleRegistry([{
      id: "synthetic-name-v1",
      family: "ucc-debtor-name",
      jurisdiction: "TEST-1",
      status: "active",
      effectiveFrom: "2026-01-01",
      authorityRefs: [{
        id: "authority",
        title: "Synthetic authority",
        jurisdiction: "TEST-1",
        sourceUri: "test://authority",
      }],
      value: {
        debtorType: "synthetic-organization",
        controllingSourceDescription: "Synthetic registry record",
      },
    }]);
    const result = resolveUccDebtorNameRule({
      registry,
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "resolved");
    assert.equal(result.ruleId, "synthetic-name-v1");
  });
});

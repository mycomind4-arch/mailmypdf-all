import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createJurisdictionRuleRegistry,
  validateJurisdictionRulePack,
} from "../src/registry.js";

const authority = {
  id: "authority-1",
  title: "Synthetic test authority",
  jurisdiction: "TEST-1",
  sourceUri: "test://authority-1",
};

describe("jurisdiction rule registry", () => {
  test("fails closed when no active rule pack covers the jurisdiction/date", () => {
    const registry = createJurisdictionRuleRegistry([]);
    const result = registry.resolve({
      family: "ucc-filing-location",
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
    assert.deepEqual(result.reasonCodes, ["no-active-supported-rule-pack"]);
  });

  test("resolves only an active, in-force, authority-backed pack", () => {
    const registry = createJurisdictionRuleRegistry([{
      id: "test-pack-v1",
      family: "ucc-filing-location",
      jurisdiction: "TEST-1",
      status: "active",
      effectiveFrom: "2026-01-01",
      authorityRefs: [authority],
      value: {
        debtorType: "synthetic",
        locationBasis: "synthetic-test-rule",
        filingOfficeId: "test-office",
        filingOfficeLabel: "Test Office",
      },
    }]);
    const result = registry.resolve({
      family: "ucc-filing-location",
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "resolved");
    assert.equal(result.ruleId, "test-pack-v1");
    assert.equal(result.authorityRefs.length, 1);
  });

  test("draft packs never execute", () => {
    const registry = createJurisdictionRuleRegistry([{
      id: "draft-pack",
      family: "ucc-priority",
      jurisdiction: "TEST-1",
      status: "draft",
      effectiveFrom: "2026-01-01",
      authorityRefs: [],
      value: { synthetic: true },
    }]);
    const result = registry.resolve({
      family: "ucc-priority",
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unsupported");
  });

  test("overlapping active packs require human review instead of choosing one", () => {
    const registry = createJurisdictionRuleRegistry([
      {
        id: "pack-a",
        family: "ucc-debtor-name",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-01-01",
        authorityRefs: [authority],
        value: { version: "a" },
      },
      {
        id: "pack-b",
        family: "ucc-debtor-name",
        jurisdiction: "TEST-1",
        status: "active",
        effectiveFrom: "2026-06-01",
        authorityRefs: [authority],
        value: { version: "b" },
      },
    ]);
    const result = registry.resolve({
      family: "ucc-debtor-name",
      jurisdiction: "TEST-1",
      asOf: "2026-09-17",
    });
    assert.equal(result.status, "unresolved");
    assert.equal(result.requiresHumanReview, true);
    assert.ok(result.reasonCodes.includes("multiple-active-rule-packs"));
  });

  test("active packs require authority references", () => {
    const errors = validateJurisdictionRulePack({
      id: "bad-pack",
      family: "ucc-filing-location",
      jurisdiction: "TEST-1",
      status: "active",
      effectiveFrom: "2026-01-01",
      authorityRefs: [],
      value: {},
    });
    assert.ok(errors.some((error) => error.includes("authority reference")));
  });
});

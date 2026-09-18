import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createBusinessRegistrySearchResult,
  normalizeBusinessRegistryRecord,
  summarizeBusinessRegistryCoverage,
} from "../src/business-registries/index.js";

const provenance = {
  provider: "synthetic-business-registry",
  jurisdiction: "TEST-1",
  queriedAt: "2026-09-17T21:00:00Z",
  query: "EXAMPLE HOLDINGS",
  sourceUri: "test://business-search",
};

describe("business registry adapter normalization", () => {
  test("normalizes an official-registry record without deciding legal identity", () => {
    const record = normalizeBusinessRegistryRecord({
      provenance,
      raw: {
        registrationNumber: "  A-123  ",
        legalName: "  Example Holdings LLC  ",
        entityType: "Limited Liability Company",
        status: " Active ",
        alternateNames: ["Example Holdings", " example holdings "],
      },
    });

    assert.equal(record.normalized.legalName, "Example Holdings LLC");
    assert.equal(record.normalized.registrationNumber, "A-123");
    assert.equal(record.normalized.status, "Active");
    assert.deepEqual(record.normalized.alternateNames, ["Example Holdings"]);
    assert.equal("authoritativeName" in record.normalized, false);
  });

  test("a complete no-hit search is still not conclusive nonexistence", () => {
    const result = createBusinessRegistrySearchResult({
      rawRecords: [],
      provenance,
      complete: true,
    });
    const coverage = summarizeBusinessRegistryCoverage(result);
    assert.equal(coverage.noHitConclusive, false);
    assert.ok(result.warnings.includes("no-hit-does-not-prove-entity-does-not-exist"));
  });

  test("requires a legal name in each normalized registry record", () => {
    assert.throws(() =>
      normalizeBusinessRegistryRecord({
        provenance,
        raw: { registrationNumber: "A-123" },
      }),
    );
  });
});

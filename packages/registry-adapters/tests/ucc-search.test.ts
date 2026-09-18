import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createUccSearchResult,
  normalizeUccFilingRecord,
  summarizeUccSearchCoverage,
} from "../src/ucc-search/index.js";

const provenance = {
  provider: "synthetic-provider",
  jurisdiction: "TEST-1",
  queriedAt: "2026-09-17T20:00:00Z",
  query: "EXAMPLE DEBTOR",
  sourceUri: "test://search",
};

describe("UCC search adapter normalization", () => {
  test("normalizes provider records without inferring priority", () => {
    const record = normalizeUccFilingRecord({
      provenance,
      raw: {
        filingNumber: "  12345  ",
        debtorNames: [" EXAMPLE DEBTOR ", "example debtor"],
        securedPartyNames: ["EXAMPLE SECURED PARTY"],
        jurisdiction: "TEST-1",
        status: " Active ",
        collateralText: "Provider-returned collateral text",
      },
    });

    assert.equal(record.id, "12345");
    assert.deepEqual(record.normalized.debtorNames, ["EXAMPLE DEBTOR"]);
    assert.equal(record.normalized.status, "Active");
    assert.equal("priority" in record.normalized, false);
  });

  test("a complete no-hit search remains explicitly non-conclusive", () => {
    const result = createUccSearchResult({
      rawRecords: [],
      provenance,
      complete: true,
    });
    const coverage = summarizeUccSearchCoverage(result);

    assert.equal(result.status, "complete");
    assert.equal(coverage.resultCount, 0);
    assert.equal(coverage.noHitConclusive, false);
    assert.ok(result.warnings.includes("no-hit-does-not-prove-no-competing-interest"));
  });

  test("partial provider coverage stays partial", () => {
    const result = createUccSearchResult({
      rawRecords: [{
        filingNumber: "12345",
        debtorNames: ["EXAMPLE DEBTOR"],
      }],
      provenance,
      complete: false,
      warnings: ["provider-date-range-limited"],
    });

    assert.equal(result.status, "partial");
    assert.ok(result.warnings.includes("search-coverage-incomplete"));
    assert.ok(result.warnings.includes("provider-date-range-limited"));
  });

  test("rejects provider records without a stable record identifier", () => {
    assert.throws(() =>
      normalizeUccFilingRecord({
        provenance,
        raw: { debtorNames: ["EXAMPLE DEBTOR"] },
      }),
    );
  });
});

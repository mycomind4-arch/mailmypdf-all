import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  explainUccSearchLimitations,
  normalizeUccFilingRecord,
  uccNoHitIsConclusive,
  type UccFilingRecord,
  type UccSearchResult,
} from "../src/index.js";

const filing: UccFilingRecord = {
  sourceId: "ucc-ca",
  sourceRecordId: "2026-001",
  sourceUrl: "https://example.gov/ucc/2026-001",
  retrievedAt: "2026-09-17T00:00:00.000Z",
  recordType: "ucc-filing",
  rawNames: ["SMITH HOLDINGS, L.L.C.", "NORTH COAST BANK"],
  identifiers: { filingNumber: "2026-001" },
  metadata: {},
  filingNumber: "2026-001",
  status: "active",
  debtorNames: ["SMITH HOLDINGS, L.L.C."],
  securedPartyNames: ["NORTH COAST BANK"],
};

describe("UCC search adapters", () => {
  test("preserves raw filing names while exposing normalized comparison forms", () => {
    const normalized = normalizeUccFilingRecord(filing);
    assert.equal(normalized.record.debtorNames[0], "SMITH HOLDINGS, L.L.C.");
    assert.equal(normalized.debtorNames[0]?.organizationDesignator, "LLC");
  });

  test("does not treat a provider-limited no-hit search as conclusive", () => {
    const result: UccSearchResult = {
      query: {
        queryId: "q1",
        purpose: "pre-filing-search",
        jurisdiction: { country: "US", state: "CA" },
      },
      source: {
        id: "ucc-ca",
        name: "UCC source",
        kind: "ucc-filing-office",
        jurisdiction: { country: "US", state: "CA" },
        officialUrl: "https://example.gov/ucc",
        accessMethod: "api",
        capabilities: ["filing-search"],
        enabled: true,
      },
      records: [],
      completeness: "provider-limited",
      searchedAt: "2026-09-17T00:00:00.000Z",
      warnings: [],
      searchedNames: ["Smith Holdings LLC"],
      providerLimitations: ["Historical filings before 2016 are excluded."],
    };
    assert.equal(uccNoHitIsConclusive(result), false);
    assert.ok(explainUccSearchLimitations(result).some((value) => value.includes("not represented as complete")));
  });

  test("marks a complete no-hit search conclusive only when the provider reports no limitations", () => {
    const result: UccSearchResult = {
      query: {
        queryId: "q2",
        purpose: "pre-filing-search",
        jurisdiction: { country: "US", state: "CA" },
      },
      source: {
        id: "ucc-ca",
        name: "UCC source",
        kind: "ucc-filing-office",
        jurisdiction: { country: "US", state: "CA" },
        officialUrl: "https://example.gov/ucc",
        accessMethod: "api",
        capabilities: ["filing-search"],
        enabled: true,
      },
      records: [],
      completeness: "complete",
      searchedAt: "2026-09-17T00:00:00.000Z",
      warnings: [],
      searchedNames: ["Smith Holdings LLC"],
      providerLimitations: [],
    };
    assert.equal(uccNoHitIsConclusive(result), true);
  });
});

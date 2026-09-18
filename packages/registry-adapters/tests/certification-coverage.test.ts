import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  searchExecutionToCertificationCoverage,
  type SearchExecution,
} from "../src/index.js";

describe("certification search coverage adapter", () => {
  test("maps a complete successful search execution into certification coverage", () => {
    const execution: SearchExecution = {
      plan: {
        purpose: "registered-organization-search",
        jurisdiction: { country: "US", state: "CA" },
        capability: "name-search",
        steps: [{
          id: "search-1",
          value: "SMITH HOLDINGS LLC",
          variantKind: "exact-authoritative",
          priority: 100,
          rationale: "exact",
        }],
        policy: {
          allowedVariantKinds: ["exact-authoritative"],
          maxVariants: 3,
          requireAuthoritativeExact: true,
          requireCompleteResults: true,
          requiredSourceIds: ["business-ca"],
        },
        warnings: [],
      },
      attempts: [{
        step: {
          id: "search-1",
          value: "SMITH HOLDINGS LLC",
          variantKind: "exact-authoritative",
          priority: 100,
          rationale: "exact",
        },
        sourceId: "business-ca",
        status: "success",
        result: {
          query: {
            queryId: "q1",
            purpose: "registered-organization-search",
            jurisdiction: { country: "US", state: "CA" },
            names: ["SMITH HOLDINGS LLC"],
          },
          source: {
            id: "business-ca",
            name: "CA business registry",
            kind: "business-registry",
            jurisdiction: { country: "US", state: "CA" },
            officialUrl: "https://example.gov/business",
            accessMethod: "api",
            capabilities: ["name-search"],
            enabled: true,
          },
          records: [],
          completeness: "complete",
          searchedAt: "2026-09-17T00:00:00.000Z",
          warnings: [],
        },
      }],
      completeness: "complete",
      totalRecords: 0,
      warnings: [],
      executedAt: "2026-09-17T00:00:00.000Z",
    };

    const coverage = searchExecutionToCertificationCoverage(execution);
    assert.equal(coverage.complete, true);
    assert.deepEqual(coverage.sourceIds, ["business-ca"]);
    assert.deepEqual(coverage.searchedNames, ["SMITH HOLDINGS LLC"]);
  });

  test("does not represent missing attempts as complete coverage", () => {
    const execution: SearchExecution = {
      plan: {
        purpose: "identity-search",
        jurisdiction: { country: "US" },
        capability: "name-search",
        steps: [{
          id: "search-1",
          value: "Jane Smith",
          variantKind: "exact-authoritative",
          priority: 100,
          rationale: "exact",
        }],
        policy: {
          allowedVariantKinds: ["exact-authoritative"],
          maxVariants: 3,
          requireAuthoritativeExact: true,
          requireCompleteResults: true,
          requiredSourceIds: ["required-source"],
        },
        warnings: [],
      },
      attempts: [{
        step: {
          id: "search-1",
          value: "Jane Smith",
          variantKind: "exact-authoritative",
          priority: 100,
          rationale: "exact",
        },
        sourceId: "required-source",
        status: "no-adapter",
        errorCode: "REQUIRED_SOURCE_UNAVAILABLE",
      }],
      completeness: "unknown",
      totalRecords: 0,
      warnings: ["One or more planned search steps or required sources were not successfully executed."],
      executedAt: "2026-09-17T00:00:00.000Z",
    };

    const coverage = searchExecutionToCertificationCoverage(execution);
    assert.equal(coverage.complete, false);
    assert.deepEqual(coverage.sourceIds, []);
  });
});

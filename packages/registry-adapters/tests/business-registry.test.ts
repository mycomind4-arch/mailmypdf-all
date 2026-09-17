import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  BusinessRegistryAdapterRegistry,
  businessRecordToAuthoritativeNameCandidate,
  businessRecordToEntityClassificationSignal,
  businessRecordSearchNames,
  type BusinessRegistryAdapter,
  type BusinessRegistryRecord,
} from "../src/index.js";

const source = {
  id: "ca-business",
  name: "California Business Search",
  kind: "business-registry" as const,
  jurisdiction: { country: "US", state: "CA" },
  officialUrl: "https://example.gov/business",
  accessMethod: "api" as const,
  capabilities: ["name-search", "identifier-search", "entity-detail"] as const,
  enabled: true,
};

const record: BusinessRegistryRecord = {
  sourceId: source.id,
  sourceRecordId: "entity-123",
  sourceUrl: "https://example.gov/business/entity-123",
  retrievedAt: "2026-09-17T00:00:00.000Z",
  recordType: "business-entity",
  rawNames: ["SMITH HOLDINGS LLC"],
  identifiers: { entityNumber: "123" },
  metadata: {},
  legalName: "SMITH HOLDINGS LLC",
  entityNumber: "123",
  entityType: "Limited Liability Company",
  status: "active",
};

describe("business registry adapters", () => {
  test("normalizes a registry record into identity-capacity evidence", () => {
    const name = businessRecordToAuthoritativeNameCandidate({ record, source });
    const type = businessRecordToEntityClassificationSignal({ record, source });
    assert.equal(name.rawName, "SMITH HOLDINGS LLC");
    assert.equal(name.source.sourceType, "official-registry-record");
    assert.equal(type.proposedType, "registered-organization");
  });

  test("produces controlled search-name forms without changing the raw legal name", () => {
    const variants = businessRecordSearchNames(record);
    assert.ok(variants.includes("SMITH HOLDINGS LLC"));
    assert.ok(variants.some((value) => value.toLowerCase().includes("smith holdings")));
    assert.equal(record.legalName, "SMITH HOLDINGS LLC");
  });

  test("resolves adapters by jurisdiction and query capability", () => {
    const adapter: BusinessRegistryAdapter = {
      source,
      supports: () => true,
      async search(query) {
        return {
          query,
          source,
          records: [record],
          completeness: "complete",
          searchedAt: "2026-09-17T00:00:00.000Z",
          warnings: [],
        };
      },
    };
    const registry = new BusinessRegistryAdapterRegistry().register(adapter);
    assert.equal(registry.resolve({
      queryId: "q1",
      purpose: "registered-organization-name",
      jurisdiction: { country: "US", state: "CA", county: "Humboldt" },
      names: ["Smith Holdings"],
    }).length, 1);
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  normalizeBusinessRegistryRecord,
} from "@mailmypdf/registry-adapters";
import { businessRegistryRecordToNameCandidate } from "../rules/business-registry";

describe("Name & Capacity business-registry bridge", () => {
  test("registry records become evidence candidates, not automatic authoritative-name conclusions", () => {
    const record = normalizeBusinessRegistryRecord({
      provenance: {
        provider: "synthetic",
        jurisdiction: "TEST-1",
        queriedAt: "2026-09-17T21:00:00Z",
        query: "EXAMPLE HOLDINGS",
      },
      raw: {
        registrationNumber: "A-123",
        legalName: "Example Holdings LLC",
      },
    });

    const candidate = businessRegistryRecordToNameCandidate(record);
    assert.equal(candidate.rawName, "Example Holdings LLC");
    assert.equal(candidate.source.sourceType, "official-registry-record");
    assert.equal("authoritativeName" in candidate, false);
  });
});

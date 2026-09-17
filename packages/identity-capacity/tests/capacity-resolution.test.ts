import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCapacity,
  capacityResolutionToFinding,
} from "../src/index.js";

describe("capacity resolution", () => {
  test("resolves trustee capacity from a governing instrument", () => {
    const result = resolveCapacity({
      actorId: "person-1",
      principalEntityId: "trust-1",
      claims: [{
        id: "trustee-claim",
        actorId: "person-1",
        capacity: "trustee",
        principalEntityId: "trust-1",
        source: {
          id: "trust-instrument",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "resolved-single");
    assert.equal(result.primaryCapacity?.capacity, "trustee");
    assert.equal(result.primaryCapacity?.principalEntityId, "trust-1");
  });

  test("representative capacity without a principal requires review", () => {
    const result = resolveCapacity({
      actorId: "person-1",
      claims: [{
        id: "manager-claim",
        actorId: "person-1",
        capacity: "manager",
        source: {
          id: "operating-agreement",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.supportedCapacities.length, 0);
  });

  test("allows multiple independently supported capacities", () => {
    const result = resolveCapacity({
      actorId: "person-1",
      claims: [
        {
          id: "individual",
          actorId: "person-1",
          capacity: "individual",
          source: {
            id: "contract-a",
            sourceType: "executed-contract",
            provenanceLevel: "document_extracted",
          },
        },
        {
          id: "manager",
          actorId: "person-1",
          capacity: "manager",
          principalEntityId: "company-1",
          source: {
            id: "operating-agreement",
            sourceType: "organizational-document",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "resolved-multiple");
    assert.equal(result.supportedCapacities.length, 2);
  });

  test("blocks ambiguous representative principals", () => {
    const result = resolveCapacity({
      actorId: "person-1",
      claims: [
        {
          id: "manager-a",
          actorId: "person-1",
          capacity: "manager",
          principalEntityId: "company-a",
          source: {
            id: "agreement-a",
            sourceType: "organizational-document",
            provenanceLevel: "document_extracted",
          },
        },
        {
          id: "manager-b",
          actorId: "person-1",
          capacity: "manager",
          principalEntityId: "company-b",
          source: {
            id: "agreement-b",
            sourceType: "organizational-document",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
  });

  test("converts a capacity result to a finding", () => {
    const result = resolveCapacity({
      actorId: "person-1",
      principalEntityId: "company-1",
      claims: [{
        id: "manager",
        actorId: "person-1",
        capacity: "manager",
        principalEntityId: "company-1",
        source: {
          id: "operating-agreement",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    const finding = capacityResolutionToFinding(result);
    assert.equal(finding.findingType, "capacity_resolution");
    assert.equal(finding.provenance.ruleId, "identity-capacity.capacity-resolution.v1");
    assert.ok(finding.entityIds.includes("person-1" as never));
    assert.ok(finding.entityIds.includes("company-1" as never));
  });
});

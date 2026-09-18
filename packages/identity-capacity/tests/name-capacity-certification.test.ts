import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  certifyNameAndCapacity,
  nameCapacityCertificationToFinding,
  type NameCapacityCertificationPolicy,
} from "../src/index.js";

const policy: NameCapacityCertificationPolicy = {
  id: "filing-readiness",
  purpose: "filing-readiness",
  minimumNameConfidence: 0.9,
  minimumEntityConfidence: 0.85,
  minimumCapacityConfidence: 0.8,
  requireCapacity: true,
  requireJurisdiction: true,
  searchRequirement: "complete",
  requiredSearchSourceIds: ["business-ca"],
};

function resolvedInputs() {
  return {
    name: {
      purpose: "registered-organization-name",
      disposition: "resolved" as const,
      authoritativeCandidateId: "name-1",
      authoritativeName: "SMITH HOLDINGS LLC",
      confidence: 0.98,
      evaluatedCandidates: [],
      conflicts: [],
      ruleIds: [],
      reasons: [],
      requiresHumanReview: false,
    },
    entity: {
      disposition: "resolved" as const,
      authoritativeType: "registered-organization" as const,
      confidence: 0.96,
      evaluatedSignals: [],
      competingTypes: [],
      reasons: [],
      ruleIds: [],
      requiresHumanReview: false,
    },
    capacity: {
      actorId: "person-1",
      principalEntityId: "entity-1",
      disposition: "resolved-single" as const,
      primaryCapacity: {
        capacity: "manager" as const,
        principalEntityId: "entity-1",
        confidence: 0.92,
        claimIds: ["capacity-1"],
      },
      supportedCapacities: [{
        capacity: "manager" as const,
        principalEntityId: "entity-1",
        confidence: 0.92,
        claimIds: ["capacity-1"],
      }],
      evaluatedClaims: [],
      reasons: [],
      ruleIds: [],
      requiresHumanReview: false,
    },
    jurisdiction: {
      purpose: "registered-organization-jurisdiction",
      policyId: "org-jurisdiction",
      disposition: "resolved" as const,
      jurisdictions: [{
        jurisdiction: { country: "US", state: "CA" },
        confidence: 0.97,
        supportingCandidateIds: ["jurisdiction-1"],
        contradictingCandidateIds: [],
        bases: ["registered-organization" as const],
      }],
      evaluatedCandidates: [],
      conflicts: [],
      reasons: [],
      ruleIds: [],
      requiresHumanReview: false,
    },
    searchCoverage: {
      complete: true,
      sourceIds: ["business-ca"],
      searchedNames: ["SMITH HOLDINGS LLC"],
      totalRecords: 1,
      warnings: [],
    },
  };
}

describe("name and capacity certification", () => {
  test("certifies a fully supported identity/capacity record", () => {
    const result = certifyNameAndCapacity({
      policy,
      ...resolvedInputs(),
      now: "2026-09-17T23:00:00.000Z",
    });
    assert.equal(result.status, "certified");
    assert.equal(result.certifiedName, "SMITH HOLDINGS LLC");
    assert.equal(result.entityType, "registered-organization");
    assert.deepEqual(result.capacities, ["manager"]);
    assert.equal(result.certifiedAt, "2026-09-17T23:00:00.000Z");
  });

  test("requires human review when upstream name resolution requires it", () => {
    const inputs = resolvedInputs();
    const result = certifyNameAndCapacity({
      policy,
      ...inputs,
      name: {
        ...inputs.name,
        disposition: "human-review-required",
        authoritativeName: undefined,
        requiresHumanReview: true,
      },
    });
    assert.equal(result.status, "human-review-required");
    assert.ok(result.blockers.includes("authoritative-name-missing"));
  });

  test("fails closed when complete registry coverage is required but incomplete", () => {
    const inputs = resolvedInputs();
    const result = certifyNameAndCapacity({
      policy,
      ...inputs,
      searchCoverage: {
        ...inputs.searchCoverage,
        complete: false,
        warnings: ["provider-limited"],
      },
    });
    assert.equal(result.status, "insufficient-evidence");
    assert.ok(result.blockers.includes("search-coverage-incomplete"));
  });

  test("can certify with explicit limitations when policy allows a weak name conflict", () => {
    const inputs = resolvedInputs();
    const result = certifyNameAndCapacity({
      policy: { ...policy, allowWeakNameConflicts: true },
      ...inputs,
      name: {
        ...inputs.name,
        disposition: "resolved-with-conflict",
      },
    });
    assert.equal(result.status, "certified-with-limits");
    assert.ok(result.limitations.includes("authoritative-name-has-lower-authority-conflict"));
  });

  test("enforces allowed entity types and required capacities", () => {
    const inputs = resolvedInputs();
    const result = certifyNameAndCapacity({
      policy: {
        ...policy,
        allowedEntityTypes: ["individual"],
        requiredCapacities: ["trustee"],
      },
      ...inputs,
    });
    assert.equal(result.status, "insufficient-evidence");
    assert.ok(result.blockers.includes("entity-type-not-allowed"));
    assert.ok(result.blockers.includes("required-capacity-missing"));
  });

  test("converts certification into an intelligence finding with its boundary stated", () => {
    const result = certifyNameAndCapacity({
      policy,
      ...resolvedInputs(),
    });
    const finding = nameCapacityCertificationToFinding(result);
    assert.equal(finding.findingType, "name_capacity_certification");
    assert.match(finding.explanation ?? "", /internal evidence readiness/);
  });
});

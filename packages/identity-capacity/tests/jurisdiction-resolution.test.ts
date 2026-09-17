import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createPurposeAuthorityRegistry } from "@mailmypdf/intelligence/authority";
import {
  jurisdictionPolicyFromAuthorityRule,
  resolveJurisdiction,
  jurisdictionResolutionToFinding,
} from "../src/index.js";

describe("jurisdiction resolution", () => {
  test("resolves organization jurisdiction only from an allowed basis", () => {
    const result = resolveJurisdiction({
      policy: {
        id: "registered-org-jurisdiction",
        purpose: "registered-organization-jurisdiction",
        allowedBases: ["registered-organization"],
        cardinality: "single",
      },
      candidates: [
        {
          id: "registry",
          jurisdiction: { country: "US", state: "DE" },
          basis: "registered-organization",
          effect: "supports",
          source: {
            id: "registry-source",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "office",
          jurisdiction: { country: "US", state: "CA" },
          basis: "principal-place-of-business",
          effect: "supports",
          source: {
            id: "website",
            sourceType: "website",
            provenanceLevel: "external_source",
          },
        },
      ],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.jurisdictions[0]?.jurisdiction.state, "DE");
    assert.equal(result.evaluatedCandidates.length, 1);
  });

  test("does not assume contract choice of law controls an unrelated purpose", () => {
    const result = resolveJurisdiction({
      policy: {
        id: "asset-location-only",
        purpose: "asset-location",
        allowedBases: ["asset-location"],
        cardinality: "single",
      },
      candidates: [{
        id: "choice-of-law",
        jurisdiction: { country: "US", state: "NY" },
        basis: "contract-choice-of-law",
        effect: "supports",
        source: {
          id: "agreement",
          sourceType: "executed-contract",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "insufficient-evidence");
    assert.equal(result.jurisdictions.length, 0);
  });

  test("blocks two strongly supported jurisdictions when policy requires one", () => {
    const result = resolveJurisdiction({
      policy: {
        id: "forum",
        purpose: "court-forum",
        allowedBases: ["court-forum"],
        cardinality: "single",
      },
      candidates: [
        {
          id: "order-ca",
          jurisdiction: { country: "US", state: "CA" },
          basis: "court-forum",
          effect: "supports",
          source: {
            id: "ca-order",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
        {
          id: "order-nv",
          jurisdiction: { country: "US", state: "NV" },
          basis: "court-forum",
          effect: "supports",
          source: {
            id: "nv-order",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.requiresHumanReview, true);
  });

  test("builds a jurisdiction policy from a purpose-scoped authority rule", () => {
    const registry = createPurposeAuthorityRegistry([
      {
        id: "org-jurisdiction-policy",
        type: "jurisdiction",
        purposes: ["registered-organization-jurisdiction"],
        jurisdiction: { country: "US" },
        source: {
          id: "authority-source",
          title: "Organization jurisdiction rule",
          issuer: "Example Authority",
          url: "https://example.gov/org-jurisdiction",
          retrievedAt: "2026-09-17T00:00:00.000Z",
        },
        value: {
          allowedBases: ["registered-organization"] as const,
          cardinality: "single" as const,
          minimumScore: 0.8,
        },
      },
    ] as const);

    const policy = jurisdictionPolicyFromAuthorityRule(registry[0]!);
    assert.equal(policy.authorityRuleId, "org-jurisdiction-policy");
    assert.deepEqual(policy.allowedBases, ["registered-organization"]);
    assert.equal(policy.minimumScore, 0.8);
  });

  test("converts resolved jurisdiction into a finding", () => {
    const result = resolveJurisdiction({
      policy: {
        id: "registered-org-jurisdiction",
        purpose: "registered-organization-jurisdiction",
        allowedBases: ["registered-organization"],
        cardinality: "single",
      },
      candidates: [{
        id: "registry",
        jurisdiction: { country: "US", state: "CA" },
        basis: "registered-organization",
        effect: "supports",
        source: {
          id: "registry-source",
          sourceType: "official-registry-record",
          provenanceLevel: "external_source",
        },
      }],
    });

    const finding = jurisdictionResolutionToFinding(result);
    assert.equal(finding.findingType, "jurisdiction_resolution");
  });
});

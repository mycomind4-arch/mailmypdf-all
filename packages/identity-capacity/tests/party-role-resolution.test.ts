import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePartyRoles,
  partyRoleClaimsFromObligation,
  partyRoleClaimsFromOwnership,
  partyRoleClaimsFromCapacity,
  partyRoleResolutionToFinding,
  resolveObligation,
  resolveOwnershipRights,
  resolveCapacity,
} from "../src/index.js";

describe("party role resolution", () => {
  test("resolves a contractual obligor role", () => {
    const result = resolvePartyRoles({
      subjectEntityId: "party-1",
      domain: "contract",
      relatedObjectId: "contract-1",
      claims: [{
        id: "obligor",
        subjectEntityId: "party-1",
        role: "obligor",
        domain: "contract",
        relatedObjectId: "contract-1",
        effect: "supports",
        source: {
          id: "agreement",
          sourceType: "executed-contract",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.roles[0]?.role, "obligor");
  });

  test("allows multiple independently evidenced roles", () => {
    const source = {
      id: "agreement",
      sourceType: "executed-contract" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const result = resolvePartyRoles({
      subjectEntityId: "party-1",
      domain: "contract",
      relatedObjectId: "contract-1",
      claims: [
        { id: "obligor", subjectEntityId: "party-1", role: "obligor", domain: "contract", relatedObjectId: "contract-1", effect: "supports", source },
        { id: "guarantor", subjectEntityId: "party-1", role: "guarantor", domain: "contract", relatedObjectId: "contract-1", effect: "supports", source },
      ],
    });

    assert.equal(result.disposition, "resolved-multiple-roles");
    assert.deepEqual(
      new Set(result.roles.map((role) => role.role)),
      new Set(["obligor", "guarantor"]),
    );
  });

  test("strong role support and contradiction require human review", () => {
    const source = {
      id: "order",
      sourceType: "court-order" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const result = resolvePartyRoles({
      subjectEntityId: "party-1",
      domain: "case",
      claims: [
        { id: "supports", subjectEntityId: "party-1", role: "respondent", domain: "case", effect: "supports", source },
        { id: "contradicts", subjectEntityId: "party-1", role: "respondent", domain: "case", effect: "contradicts", source },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
  });

  test("obligation bridge creates creditor and obligor roles but not debtor", () => {
    const source = {
      id: "agreement",
      sourceType: "executed-contract" as const,
      provenanceLevel: "document_extracted" as const,
    };
    const obligation = resolveObligation({
      obligationId: "obligation-1",
      claims: [
        { id: "creditor", obligationId: "obligation-1", field: "creditor-entity-id", value: "creditor-1", effect: "supports", source },
        { id: "obligor", obligationId: "obligation-1", field: "obligor-entity-id", value: "obligor-1", effect: "supports", source },
      ],
    });
    const claims = partyRoleClaimsFromObligation(obligation);

    assert.ok(claims.some((claim) => claim.role === "creditor"));
    assert.ok(claims.some((claim) => claim.role === "obligor"));
    assert.ok(!claims.some((claim) => claim.role === "debtor"));
  });

  test("ownership bridge creates owner role but not collateral-owner", () => {
    const ownership = resolveOwnershipRights({
      assetId: "asset-1",
      claims: [{
        id: "title",
        assetId: "asset-1",
        holderEntityId: "owner-1",
        interestType: "recorded-owner",
        effect: "supports",
        source: {
          id: "title-source",
          sourceType: "recorded-title",
          provenanceLevel: "external_source",
        },
      }],
    });
    const claims = partyRoleClaimsFromOwnership(ownership);

    assert.ok(claims.some((claim) => claim.role === "owner"));
    assert.ok(!claims.some((claim) => claim.role === "collateral-owner"));
  });

  test("capacity bridge preserves manager role and agent/principal relation", () => {
    const capacity = resolveCapacity({
      actorId: "person-1",
      claims: [
        {
          id: "manager",
          actorId: "person-1",
          capacity: "manager",
          principalEntityId: "company-1",
          source: {
            id: "company-governance",
            sourceType: "organizational-document",
            provenanceLevel: "document_extracted",
          },
        },
        {
          id: "agent",
          actorId: "person-1",
          capacity: "agent",
          principalEntityId: "principal-1",
          source: {
            id: "agency-contract",
            sourceType: "executed-contract",
            provenanceLevel: "document_extracted",
          },
        },
      ],
      principalEntityId: undefined,
    });

    // Multiple representative principals intentionally require review in the generic
    // capacity query. Resolve the two relationships separately for bridging.
    const manager = resolveCapacity({
      actorId: "person-1",
      principalEntityId: "company-1",
      claims: capacity.evaluatedClaims.map((item) => item.claim),
    });
    const managerClaims = partyRoleClaimsFromCapacity(manager);
    assert.ok(managerClaims.some((claim) => claim.role === "manager"));

    const agent = resolveCapacity({
      actorId: "person-1",
      principalEntityId: "principal-1",
      claims: capacity.evaluatedClaims.map((item) => item.claim),
    });
    const agentClaims = partyRoleClaimsFromCapacity(agent);
    assert.ok(agentClaims.some((claim) => claim.role === "agent"));
    assert.ok(agentClaims.some((claim) => claim.role === "principal"));
  });

  test("converts role resolution into a finding", () => {
    const result = resolvePartyRoles({
      subjectEntityId: "party-1",
      domain: "contract",
      claims: [{
        id: "obligor",
        subjectEntityId: "party-1",
        role: "obligor",
        domain: "contract",
        effect: "supports",
        source: {
          id: "agreement",
          sourceType: "executed-contract",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    const finding = partyRoleResolutionToFinding(result);
    assert.equal(finding.findingType, "party_role_resolution");
    assert.equal(finding.provenance.ruleId, "identity-capacity.party-role-resolution.v1");
  });
});

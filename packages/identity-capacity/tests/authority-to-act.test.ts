import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAuthorityToAct,
  authorityToActToFinding,
} from "../src/index.js";

describe("authority to act", () => {
  test("resolves a supported grant for the requested action", () => {
    const result = resolveAuthorityToAct({
      actorId: "person-1",
      capacity: "manager",
      action: {
        type: "encumber-equipment",
        principalEntityId: "company-1",
      },
      evidence: [{
        id: "grant-1",
        actorId: "person-1",
        principalEntityId: "company-1",
        capacity: "manager",
        actionTypes: ["encumber-equipment"],
        effect: "grant",
        source: {
          id: "operating-agreement",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "authorized");
    assert.equal(result.requiresHumanReview, false);
    assert.deepEqual(result.supportingEvidenceIds, ["grant-1"]);
  });

  test("does not infer authority merely from a role when the evidence is too weak", () => {
    const result = resolveAuthorityToAct({
      actorId: "person-1",
      capacity: "manager",
      action: {
        type: "encumber-equipment",
        principalEntityId: "company-1",
      },
      evidence: [{
        id: "registry-role",
        actorId: "person-1",
        principalEntityId: "company-1",
        capacity: "manager",
        actionTypes: ["encumber-equipment"],
        effect: "grant",
        confidence: 0.55,
        source: {
          id: "registry",
          sourceType: "official-registry-record",
          provenanceLevel: "user_provided",
        },
      }],
    });

    assert.notEqual(result.disposition, "authorized");
  });

  test("strong restriction blocks the requested action", () => {
    const result = resolveAuthorityToAct({
      actorId: "person-1",
      capacity: "manager",
      action: {
        type: "sell-real-property",
        principalEntityId: "company-1",
      },
      evidence: [{
        id: "restriction-1",
        actorId: "person-1",
        principalEntityId: "company-1",
        capacity: "manager",
        actionTypes: ["sell-real-property"],
        effect: "restrict",
        source: {
          id: "operating-agreement",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "not-authorized");
    assert.deepEqual(result.restrictingEvidenceIds, ["restriction-1"]);
  });

  test("strong grant and strong revocation require human review", () => {
    const result = resolveAuthorityToAct({
      actorId: "person-1",
      capacity: "agent",
      action: {
        type: "sign-contract",
        principalEntityId: "principal-1",
      },
      evidence: [
        {
          id: "grant-1",
          actorId: "person-1",
          principalEntityId: "principal-1",
          capacity: "agent",
          actionTypes: ["sign-contract"],
          effect: "grant",
          source: {
            id: "agency-agreement",
            sourceType: "executed-contract",
            provenanceLevel: "document_extracted",
          },
        },
        {
          id: "revocation-1",
          actorId: "person-1",
          principalEntityId: "principal-1",
          capacity: "agent",
          actionTypes: ["sign-contract"],
          effect: "revoke",
          source: {
            id: "revocation-order",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.requiresHumanReview, true);
  });

  test("scopes authority to the requested principal and action", () => {
    const result = resolveAuthorityToAct({
      actorId: "person-1",
      capacity: "manager",
      action: {
        type: "borrow",
        principalEntityId: "company-b",
      },
      evidence: [{
        id: "company-a-grant",
        actorId: "person-1",
        principalEntityId: "company-a",
        capacity: "manager",
        actionTypes: ["borrow"],
        effect: "grant",
        source: {
          id: "company-a-agreement",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    assert.equal(result.disposition, "insufficient-evidence");
  });

  test("converts the result to a provenance-preserving finding", () => {
    const result = resolveAuthorityToAct({
      actorId: "person-1",
      capacity: "manager",
      action: {
        type: "encumber-equipment",
        principalEntityId: "company-1",
      },
      evidence: [{
        id: "grant-1",
        actorId: "person-1",
        principalEntityId: "company-1",
        capacity: "manager",
        actionTypes: ["encumber-equipment"],
        effect: "grant",
        source: {
          id: "operating-agreement",
          sourceType: "organizational-document",
          provenanceLevel: "document_extracted",
        },
      }],
    });

    const finding = authorityToActToFinding(result);
    assert.equal(finding.findingType, "authority_to_act");
    assert.equal(finding.provenance.ruleId, "identity-capacity.authority-to-act.v1");
  });
});

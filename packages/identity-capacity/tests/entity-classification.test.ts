import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveEntityClassification,
  entityClassificationToFinding,
} from "../src/index.js";

describe("entity classification", () => {
  test("resolves a registered organization from an official registry", () => {
    const result = resolveEntityClassification({
      signals: [{
        id: "registry",
        proposedType: "registered-organization",
        entityId: "entity-1",
        source: {
          id: "registry-source",
          sourceType: "official-registry-record",
          provenanceLevel: "external_source",
        },
      }],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.authoritativeType, "registered-organization");
    assert.equal(result.requiresHumanReview, false);
  });

  test("does not promote AI-only classification", () => {
    const result = resolveEntityClassification({
      signals: [{
        id: "ai",
        proposedType: "trust",
        source: {
          id: "ai-source",
          sourceType: "ai-inference",
          provenanceLevel: "ai_inferred",
        },
      }],
    });

    assert.equal(result.disposition, "insufficient-evidence");
    assert.equal(result.authoritativeType, undefined);
  });

  test("blocks conflicting strong classifications", () => {
    const result = resolveEntityClassification({
      signals: [
        {
          id: "org",
          proposedType: "registered-organization",
          source: {
            id: "registry",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "estate",
          proposedType: "estate",
          source: {
            id: "probate-order",
            sourceType: "court-order",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.authoritativeType, undefined);
    assert.ok(result.competingTypes.includes("estate") || result.competingTypes.includes("registered-organization"));
  });

  test("preserves lower-authority disagreement without allowing it to override", () => {
    const result = resolveEntityClassification({
      signals: [
        {
          id: "registry",
          proposedType: "registered-organization",
          source: {
            id: "registry-source",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "user",
          proposedType: "sole-proprietorship",
          source: {
            id: "user-source",
            sourceType: "user-statement",
            provenanceLevel: "user_provided",
          },
        },
      ],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.authoritativeType, "registered-organization");
  });

  test("converts classification into a provenance-preserving finding", () => {
    const result = resolveEntityClassification({
      signals: [{
        id: "registry",
        proposedType: "registered-organization",
        entityId: "entity-1",
        source: {
          id: "registry-source",
          sourceType: "official-registry-record",
          provenanceLevel: "external_source",
        },
      }],
    });
    const finding = entityClassificationToFinding(result);
    assert.equal(finding.findingType, "entity_classification");
    assert.equal(finding.provenance.ruleId, "identity-capacity.entity-classification.v1");
    assert.deepEqual(finding.entityIds, ["entity-1"]);
  });
});

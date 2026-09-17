import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAuthoritativeName,
  authoritativeNameResolutionToFinding,
} from "../src/index.js";

describe("authoritative name resolution", () => {
  test("selects an official registry record over a website", () => {
    const result = resolveAuthoritativeName({
      purpose: "registered-organization-name",
      candidates: [
        {
          id: "website-name",
          rawName: "Smith Holdings",
          confidence: 0.95,
          source: {
            id: "website",
            sourceType: "website",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "registry-name",
          rawName: "SMITH HOLDINGS LLC",
          confidence: 0.95,
          source: {
            id: "registry",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
      ],
    });

    assert.equal(result.disposition, "resolved-with-conflict");
    assert.equal(result.authoritativeCandidateId, "registry-name");
    assert.equal(result.authoritativeName, "SMITH HOLDINGS LLC");
    assert.equal(result.requiresHumanReview, false);
  });

  test("same normalized form corroborates rather than conflicts", () => {
    const result = resolveAuthoritativeName({
      purpose: "registered-organization-name",
      candidates: [
        {
          id: "registry-1",
          rawName: "Smith Holdings, L.L.C.",
          source: {
            id: "registry",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "org-doc",
          rawName: "SMITH HOLDINGS LLC",
          source: {
            id: "articles",
            sourceType: "organizational-document",
            provenanceLevel: "document_extracted",
          },
        },
      ],
    });

    assert.equal(result.disposition, "resolved");
    assert.equal(result.conflicts.length, 0);
  });

  test("conflicting strong sources require human review", () => {
    const result = resolveAuthoritativeName({
      purpose: "registered-organization-name",
      candidates: [
        {
          id: "registry-a",
          rawName: "North Coast Equipment LLC",
          source: {
            id: "registry-a-source",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
        {
          id: "registry-b",
          rawName: "North Coast Equipment Holdings LLC",
          source: {
            id: "registry-b-source",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
      ],
    });

    assert.equal(result.disposition, "human-review-required");
    assert.equal(result.authoritativeName, undefined);
    assert.equal(result.requiresHumanReview, true);
    assert.ok(result.conflicts.some((conflict) => conflict.severity === "strong"));
  });

  test("weak evidence alone is not promoted into an authoritative conclusion", () => {
    const result = resolveAuthoritativeName({
      purpose: "registered-organization-name",
      candidates: [
        {
          id: "website",
          rawName: "Smith Holdings",
          source: {
            id: "website-source",
            sourceType: "website",
            provenanceLevel: "external_source",
          },
        },
      ],
    });

    assert.equal(result.disposition, "insufficient-evidence");
    assert.equal(result.authoritativeName, undefined);
  });

  test("produces a provenance-preserving intelligence finding", () => {
    const result = resolveAuthoritativeName({
      purpose: "registered-organization-name",
      candidates: [
        {
          id: "registry",
          rawName: "SMITH HOLDINGS LLC",
          entityId: "entity-1",
          source: {
            id: "registry-source",
            sourceType: "official-registry-record",
            provenanceLevel: "external_source",
          },
        },
      ],
    });

    const finding = authoritativeNameResolutionToFinding(result);
    assert.equal(finding.findingType, "authoritative_name_resolution");
    assert.equal(finding.provenance.level, "rule_derived");
    assert.equal(finding.provenance.ruleId, "identity-capacity.authoritative-name.v1");
    assert.deepEqual(finding.entityIds, ["entity-1"]);
  });
});

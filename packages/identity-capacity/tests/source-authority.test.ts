import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSourceAuthority } from "../src/index.js";

describe("source authority", () => {
  test("official organizational record outranks a website for registered name", () => {
    const registry = evaluateSourceAuthority({
      source: {
        id: "registry",
        sourceType: "official-registry-record",
        provenanceLevel: "external_source",
      },
      context: { purpose: "registered-organization-name" },
    });
    const website = evaluateSourceAuthority({
      source: {
        id: "website",
        sourceType: "website",
        provenanceLevel: "external_source",
      },
      context: { purpose: "registered-organization-name" },
    });

    assert.ok(registry.score > website.score);
    assert.equal(registry.tier, "authoritative");
  });

  test("AI inference cannot independently become authoritative", () => {
    const result = evaluateSourceAuthority({
      source: {
        id: "ai",
        sourceType: "ai-inference",
        provenanceLevel: "ai_inferred",
      },
      context: { purpose: "registered-organization-name" },
    });

    assert.ok(result.score <= 0.25);
    assert.equal(result.requiresHumanReview, true);
  });

  test("source authority is purpose-specific", () => {
    const titleForOwnership = evaluateSourceAuthority({
      source: {
        id: "deed",
        sourceType: "recorded-title",
        provenanceLevel: "external_source",
      },
      context: { purpose: "property-owner" },
    });
    const titleForOrgName = evaluateSourceAuthority({
      source: {
        id: "deed",
        sourceType: "recorded-title",
        provenanceLevel: "external_source",
      },
      context: { purpose: "registered-organization-name" },
    });

    assert.ok(titleForOwnership.score > titleForOrgName.score);
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type ProvenanceLevel,
  ALL_PROVENANCE_LEVELS,
  PROVENANCE_STRENGTH,
  isAutoTrusted,
  canPresentWithoutDisclaimer,
  strongerProvenance,
  createProvenance,
  verifyProvenance,
  type SourceRef,
  createSourceRef,
  createId,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Provenance", () => {
  // ── Provenance Levels ────────────────────────────────────────────────────────
  test("all six provenance levels are defined", () => {
    assert.equal(ALL_PROVENANCE_LEVELS.length, 6);
    assert.ok(ALL_PROVENANCE_LEVELS.includes("user_provided"));
    assert.ok(ALL_PROVENANCE_LEVELS.includes("document_extracted"));
    assert.ok(ALL_PROVENANCE_LEVELS.includes("external_source"));
    assert.ok(ALL_PROVENANCE_LEVELS.includes("rule_derived"));
    assert.ok(ALL_PROVENANCE_LEVELS.includes("ai_inferred"));
    assert.ok(ALL_PROVENANCE_LEVELS.includes("human_verified"));
  });

  test("provenance strength ordering is correct", () => {
    assert.equal(PROVENANCE_STRENGTH.human_verified, 5);
    assert.equal(PROVENANCE_STRENGTH.document_extracted, 4);
    assert.equal(PROVENANCE_STRENGTH.external_source, 3);
    assert.equal(PROVENANCE_STRENGTH.rule_derived, 3);
    assert.equal(PROVENANCE_STRENGTH.user_provided, 2);
    assert.equal(PROVENANCE_STRENGTH.ai_inferred, 1);

    // human_verified > document_extracted > external_source > user_provided > ai_inferred
    assert.ok(PROVENANCE_STRENGTH.human_verified > PROVENANCE_STRENGTH.document_extracted);
    assert.ok(PROVENANCE_STRENGTH.document_extracted > PROVENANCE_STRENGTH.user_provided);
    assert.ok(PROVENANCE_STRENGTH.user_provided > PROVENANCE_STRENGTH.ai_inferred);
  });

  test("isAutoTrusted only trusts human_verified and document_extracted", () => {
    assert.ok(isAutoTrusted("human_verified"));
    assert.ok(isAutoTrusted("document_extracted"));
    assert.ok(!isAutoTrusted("external_source"));
    assert.ok(!isAutoTrusted("rule_derived"));
    assert.ok(!isAutoTrusted("user_provided"));
    assert.ok(!isAutoTrusted("ai_inferred"));
  });

  test("canPresentWithoutDisclaimer matches isAutoTrusted", () => {
    assert.ok(canPresentWithoutDisclaimer("human_verified"));
    assert.ok(canPresentWithoutDisclaimer("document_extracted"));
    assert.ok(!canPresentWithoutDisclaimer("ai_inferred"));
  });

  test("strongerProvenance returns the more trustworthy level", () => {
    assert.equal(strongerProvenance("ai_inferred", "human_verified"), "human_verified");
    assert.equal(strongerProvenance("document_extracted", "ai_inferred"), "document_extracted");
    assert.equal(strongerProvenance("user_provided", "external_source"), "external_source");
  });

  // ── Provenance Record Creation ─────────────────────────────────────────────
  test("createProvenance creates a record with timestamp", () => {
    const prov = createProvenance({ level: "user_provided" });
    assert.equal(prov.level, "user_provided");
    assert.ok(prov.recordedAt);
    assert.equal(prov.sourceRefs.length, 0);
  });

  test("createProvenance preserves source refs", () => {
    const ref: SourceRef = createSourceRef({
      documentId: createId("doc-001"),
      documentName: "notice.pdf",
      page: 2,
    });
    const prov = createProvenance({ level: "document_extracted", sourceRefs: [ref] });
    assert.equal(prov.sourceRefs.length, 1);
    assert.equal(prov.sourceRefs[0]!.documentId, "doc-001");
    assert.equal(prov.sourceRefs[0]!.page, 2);
  });

  test("createProvenance for AI-inferred requires modelId", () => {
    assert.throws(() =>
      createProvenance({ level: "ai_inferred" }),
      /AI-inferred provenance requires a modelId/,
    );
    const prov = createProvenance({ level: "ai_inferred", modelId: "claude-4-sonnet" });
    assert.equal(prov.modelId, "claude-4-sonnet");
  });

  test("createProvenance for human_verified requires verifiedBy", () => {
    assert.throws(() =>
      createProvenance({ level: "human_verified" }),
      /Human-verified provenance requires a verifiedBy/,
    );
    const prov = createProvenance({ level: "human_verified", verifiedBy: "user@example.com" });
    assert.equal(prov.verifiedBy, "user@example.com");
  });

  test("createProvenance for rule_derived requires ruleId", () => {
    assert.throws(() =>
      createProvenance({ level: "rule_derived" }),
      /Rule-derived provenance requires a ruleId/,
    );
    const prov = createProvenance({ level: "rule_derived", ruleId: "deadline-30-days" });
    assert.equal(prov.ruleId, "deadline-30-days");
  });

  // ── Provenance Verification ─────────────────────────────────────────────────
  test("verifyProvenance upgrades level to human_verified", () => {
    const original = createProvenance({ level: "ai_inferred", modelId: "claude-4" });
    assert.equal(original.level, "ai_inferred");

    const verified = verifyProvenance(original, "user@example.com");
    assert.equal(verified.level, "human_verified");
    assert.equal(verified.verifiedBy, "user@example.com");
    // Original is NOT mutated
    assert.equal(original.level, "ai_inferred");
  });

  test("verifyProvenance preserves source refs from original", () => {
    const ref: SourceRef = createSourceRef({
      documentId: createId("doc-001"),
      documentName: "decision.pdf",
      page: 3,
    });
    const original = createProvenance({ level: "document_extracted", sourceRefs: [ref] });
    const verified = verifyProvenance(original, "user@example.com");
    assert.equal(verified.sourceRefs.length, 1);
    assert.equal(verified.sourceRefs[0]!.page, 3);
  });

  // ── Adversarial Inputs ──────────────────────────────────────────────────────
  test("rejects unknown provenance levels", () => {
    // TypeScript prevents this at compile time, but runtime should also be safe
    const levels = new Set(ALL_PROVENANCE_LEVELS);
    assert.ok(!levels.has("unknown" as ProvenanceLevel));
    assert.ok(!levels.has("verified" as ProvenanceLevel));
    assert.ok(!levels.has("ai" as ProvenanceLevel));
  });

  test("AI-inferred provenance with empty modelId is rejected", () => {
    assert.throws(() =>
      createProvenance({ level: "ai_inferred", modelId: "" }),
      /AI-inferred provenance requires a modelId/,
    );
  });
});

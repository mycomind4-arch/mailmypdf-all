import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type Fact,
  type FactStatus,
  createFact,
  verifyFact,
  supersedeFact,
  disputeFact,
  retractFact,
  validateFact,
  isFactActive,
  isFactSuperseded,
  isFactDisputed,
  isFactRetracted,
  factsBySubject,
  factsByPredicate,
  findConflictingFacts,
  MAX_SUBJECT_LENGTH,
  MAX_PREDICATE_LENGTH,
  MAX_VALUE_LENGTH,
  createId,
  type SourceRef,
  createSourceRef,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FACT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Fact", () => {
  // ── Creation ────────────────────────────────────────────────────────────────
  test("creates a fact with subject, predicate, value", () => {
    const fact = createFact({
      subject: "person_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "document_extracted" },
    });
    assert.ok(fact.id);
    assert.equal(fact.subject, "person_001");
    assert.equal(fact.predicate, "has_deadline");
    assert.equal(fact.value, "2026-09-15");
    assert.equal(fact.status, "active");
    assert.equal(fact.verified, false);
    assert.equal(fact.confidence, 0.5);
  });

  test("creates a fact with source references", () => {
    const ref: SourceRef = createSourceRef({
      documentId: createId("doc-001"),
      documentName: "notice.pdf",
      page: 2,
      excerpt: "Response due by September 15, 2026",
    });
    const fact = createFact({
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
      confidence: 0.9,
    });
    assert.equal(fact.provenance.sourceRefs.length, 1);
    assert.equal(fact.provenance.sourceRefs[0]!.page, 2);
    assert.equal(fact.confidence, 0.9);
  });

  test("creates a fact with custom ID", () => {
    const fact = createFact({
      id: "fact-001",
      subject: "case_001",
      predicate: "has_type",
      value: "RFE",
      provenance: { level: "user_provided" },
    });
    assert.equal(fact.id, "fact-001");
  });

  test("AI-inferred fact is not auto-verified", () => {
    const fact = createFact({
      subject: "case_001",
      predicate: "has_type",
      value: "NOID",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    assert.equal(fact.verified, false);
  });

  // ── Validation ───────────────────────────────────────────────────────────────
  test("rejects empty subject", () => {
    assert.throws(
      () => createFact({ subject: "", predicate: "test", value: "test", provenance: { level: "user_provided" } }),
      /subject must not be empty/,
    );
  });

  test("rejects empty predicate", () => {
    assert.throws(
      () => createFact({ subject: "test", predicate: "", value: "test", provenance: { level: "user_provided" } }),
      /predicate must not be empty/,
    );
  });

  test("rejects empty value", () => {
    assert.throws(
      () => createFact({ subject: "test", predicate: "test", value: "", provenance: { level: "user_provided" } }),
      /value must not be empty/,
    );
  });

  test("rejects subject exceeding max length", () => {
    assert.throws(
      () => createFact({
        subject: "x".repeat(MAX_SUBJECT_LENGTH + 1),
        predicate: "test",
        value: "test",
        provenance: { level: "user_provided" },
      }),
      /subject must not exceed/,
    );
  });

  test("rejects value exceeding max length", () => {
    assert.throws(
      () => createFact({
        subject: "test",
        predicate: "test",
        value: "x".repeat(MAX_VALUE_LENGTH + 1),
        provenance: { level: "user_provided" },
      }),
      /value must not exceed/,
    );
  });

  test("validateFact returns ok for valid fact", () => {
    const fact = createFact({
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "user_provided" },
    });
    const result = validateFact(fact);
    assert.ok(result.ok);
  });

  test("validateFact returns error for invalid fact", () => {
    const fact = createFact({
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "user_provided" },
    });
    const invalid = { ...fact, value: "" } as Fact;
    const result = validateFact(invalid);
    assert.ok(!result.ok);
  });

  // ── Verification ──────────────────────────────────────────────────────────────
  test("verifyFact upgrades to human_verified", () => {
    const fact = createFact({
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    assert.equal(fact.verified, false);

    const verified = verifyFact(fact, "user@example.com");
    assert.equal(verified.verified, true);
    assert.equal(verified.provenance.level, "human_verified");
    assert.equal(verified.provenance.verifiedBy, "user@example.com");
  });

  // ── Append-Only History (Supersession) ────────────────────────────────────────
  test("supersedeFact marks old fact as superseded, preserves history", () => {
    const oldFact = createFact({
      id: "fact-old",
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const newFact = createFact({
      id: "fact-new",
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-10-15",
      provenance: { level: "document_extracted" },
    });

    const { old, updated } = supersedeFact(oldFact, newFact);
    assert.equal(old.status, "superseded");
    assert.equal(old.supersededBy, "fact-new");
    assert.equal(updated.status, "active");
    assert.equal(updated.value, "2026-10-15");
    // Old fact still exists — not destroyed
    assert.ok(isFactSuperseded(old));
    assert.ok(isFactActive(updated));
  });

  test("supersedeFact rejects different subject/predicate", () => {
    const fact1 = createFact({
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "user_provided" },
    });
    const fact2 = createFact({
      subject: "case_002",
      predicate: "has_deadline",
      value: "2026-10-15",
      provenance: { level: "user_provided" },
    });
    assert.throws(() => supersedeFact(fact1, fact2), /different subject\/predicate/);
  });

  // ── Dispute ───────────────────────────────────────────────────────────────────
  test("disputeFact marks fact as disputed without destroying it", () => {
    const fact = createFact({
      id: "fact-001",
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const disputed = disputeFact(fact, createId("fact-002"));
    assert.equal(disputed.status, "disputed");
    assert.equal(disputed.disputedBy!.length, 1);
    assert.ok(isFactDisputed(disputed));
    // Original fact still active
    assert.ok(isFactActive(fact));
  });

  test("disputeFact is idempotent", () => {
    const fact = createFact({
      id: "fact-001",
      subject: "case_001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "user_provided" },
    });
    const disputingId = createId("fact-002");
    const disputed1 = disputeFact(fact, disputingId);
    const disputed2 = disputeFact(disputed1, disputingId);
    assert.equal(disputed2.disputedBy!.length, 1);
  });

  // ── Retraction ───────────────────────────────────────────────────────────────
  test("retractFact marks fact as retracted", () => {
    const fact = createFact({
      subject: "case_001",
      predicate: "has_type",
      value: "RFE",
      provenance: { level: "user_provided" },
    });
    const retracted = retractFact(fact);
    assert.equal(retracted.status, "retracted");
    assert.ok(isFactRetracted(retracted));
    assert.ok(!isFactActive(retracted));
  });

  // ── Queries ───────────────────────────────────────────────────────────────────
  test("factsBySubject returns active facts for a subject", () => {
    const facts = [
      createFact({ subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "user_provided" } }),
      createFact({ subject: "case_002", predicate: "has_deadline", value: "2026-10-15", provenance: { level: "user_provided" } }),
      createFact({ subject: "case_001", predicate: "has_type", value: "RFE", provenance: { level: "user_provided" } }),
    ];
    const result = factsBySubject(facts, "case_001");
    assert.equal(result.length, 2);
  });

  test("factsByPredicate returns active facts for a predicate", () => {
    const facts = [
      createFact({ subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "user_provided" } }),
      createFact({ subject: "case_002", predicate: "has_deadline", value: "2026-10-15", provenance: { level: "user_provided" } }),
      createFact({ subject: "case_001", predicate: "has_type", value: "RFE", provenance: { level: "user_provided" } }),
    ];
    const result = factsByPredicate(facts, "has_deadline");
    assert.equal(result.length, 2);
  });

  test("factsBySubject excludes superseded facts", () => {
    const old = createFact({ id: "old", subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "user_provided" } });
    const newer = createFact({ id: "new", subject: "case_001", predicate: "has_deadline", value: "2026-10-15", provenance: { level: "document_extracted" } });
    const { old: superseded } = supersedeFact(old, newer);
    const result = factsBySubject([superseded, newer], "case_001");
    assert.equal(result.length, 1);
    assert.equal(result[0]!.value, "2026-10-15");
  });

  // ── Conflict Detection ───────────────────────────────────────────────────────
  test("findConflictingFacts detects same subject/predicate with different values", () => {
    const facts = [
      createFact({ subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ subject: "case_001", predicate: "has_deadline", value: "2026-10-15", provenance: { level: "document_extracted" } }),
      createFact({ subject: "case_002", predicate: "has_deadline", value: "2026-11-15", provenance: { level: "user_provided" } }),
    ];
    const conflicts = findConflictingFacts(facts);
    assert.equal(conflicts.length, 2);
    // Both conflicting facts have case_001/has_deadline
    assert.ok(conflicts.every(f => f.subject === "case_001" && f.predicate === "has_deadline"));
  });

  test("findConflictingFacts ignores same values", () => {
    const facts = [
      createFact({ subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "user_provided" } }),
      createFact({ subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
    ];
    const conflicts = findConflictingFacts(facts);
    assert.equal(conflicts.length, 0);
  });

  test("findConflictingFacts ignores superseded facts", () => {
    const old = createFact({ id: "old", subject: "case_001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "user_provided" } });
    const newer = createFact({ id: "new", subject: "case_001", predicate: "has_deadline", value: "2026-10-15", provenance: { level: "document_extracted" } });
    const { old: superseded } = supersedeFact(old, newer);
    const conflicts = findConflictingFacts([superseded, newer]);
    assert.equal(conflicts.length, 0);
  });

  // ── Adversarial Inputs ────────────────────────────────────────────────────────
  test("rejects invalid confidence values", () => {
    assert.throws(
      () => createFact({
        subject: "test",
        predicate: "test",
        value: "test",
        provenance: { level: "user_provided" },
        confidence: -0.1,
      }),
      /Confidence/,
    );
    assert.throws(
      () => createFact({
        subject: "test",
        predicate: "test",
        value: "test",
        provenance: { level: "user_provided" },
        confidence: 1.5,
      }),
      /Confidence/,
    );
  });

  test("AI-inferred fact without modelId is rejected", () => {
    assert.throws(
      () => createFact({
        subject: "test",
        predicate: "test",
        value: "test",
        provenance: { level: "ai_inferred" },
      }),
      /AI-inferred provenance requires a modelId/,
    );
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type Contradiction,
  type ContradictionSeverity,
  type DetectionType,
  ALL_SEVERITY_LEVELS,
  SEVERITY_WEIGHT,
  MAX_CONTRADICTION_EXPLANATION,
  MAX_FACTS_FOR_DETECTION,
  MAX_PAIRS_PER_GROUP,
  createContradiction,
  reviewContradiction,
  resolveContradiction,
  validateContradiction,
  isUnreviewed,
  isReviewed,
  isResolved,
  isCritical,
  isMajor,
  isMinor,
  isConfirmed,
  isPotential,
  contradictionsForFact,
  unresolvedContradictions,
  criticalContradictions,
  confirmedContradictions,
  potentialContradictions,
  classifyPredicate,
  detectContradictions,
  sortBySeverity,
  sortByReviewStatus,
  createFact,
  createId,
  createSourceRef,
  createEvidence,
  createEvidencePacket,
  evaluateEvidence,
  evidenceForClaim,
  hasContradictions,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION ITEM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Item", () => {
  test("createContradiction produces a valid contradiction with default detectionType=potential", () => {
    const c = createContradiction({
      factAId: "fact-001",
      factBId: "fact-002",
      conflictSubject: "case-001",
      conflictPredicate: "has_deadline",
      factAValue: "2026-09-15",
      factBValue: "2026-09-20",
      severity: "critical",
      explanation: "Two documents specify different deadlines",
      provenance: { level: "rule_derived", ruleId: "conflict-detector" },
    });

    assert.equal(c.factAId, "fact-001");
    assert.equal(c.factBId, "fact-002");
    assert.equal(c.conflictSubject, "case-001");
    assert.equal(c.conflictPredicate, "has_deadline");
    assert.equal(c.factAValue, "2026-09-15");
    assert.equal(c.factBValue, "2026-09-20");
    assert.equal(c.severity, "critical");
    assert.equal(c.detectionType, "potential"); // default
    assert.equal(c.reviewStatus, "unreviewed");
    assert.equal(c.verified, false);
    assert.ok(c.id);
  });

  test("createContradiction accepts explicit detectionType=confirmed", () => {
    const c = createContradiction({
      factAId: "fact-001",
      factBId: "fact-002",
      conflictSubject: "case-001",
      conflictPredicate: "has_deadline",
      factAValue: "2026-09-15",
      factBValue: "2026-09-20",
      severity: "critical",
      detectionType: "confirmed",
      provenance: { level: "rule_derived", ruleId: "conflict-detector" },
    });

    assert.equal(c.detectionType, "confirmed");
  });

  test("createContradiction rejects same fact for both sides", () => {
    assert.throws(
      () => createContradiction({
        factAId: "fact-001",
        factBId: "fact-001",
        conflictSubject: "case-001",
        conflictPredicate: "has_deadline",
        factAValue: "2026-09-15",
        factBValue: "2026-09-20",
        severity: "critical",
        provenance: { level: "user_provided" },
      }),
      /itself/,
    );
  });

  test("createContradiction rejects empty fact IDs", () => {
    assert.throws(
      () => createContradiction({
        factAId: "",
        factBId: "fact-002",
        conflictSubject: "case-001",
        conflictPredicate: "has_deadline",
        factAValue: "a",
        factBValue: "b",
        severity: "major",
        provenance: { level: "user_provided" },
      }),
      /factAId/,
    );
  });

  test("createContradiction rejects invalid severity", () => {
    assert.throws(
      () => createContradiction({
        factAId: "fact-001",
        factBId: "fact-002",
        conflictSubject: "case-001",
        conflictPredicate: "has_deadline",
        factAValue: "a",
        factBValue: "b",
        severity: "invalid" as ContradictionSeverity,
        provenance: { level: "user_provided" },
      }),
      /severity/,
    );
  });

  test("createContradiction rejects oversized explanation", () => {
    assert.throws(
      () => createContradiction({
        factAId: "fact-001",
        factBId: "fact-002",
        conflictSubject: "case-001",
        conflictPredicate: "has_deadline",
        factAValue: "a",
        factBValue: "b",
        severity: "minor",
        explanation: "x".repeat(MAX_CONTRADICTION_EXPLANATION + 1),
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("supports all severity levels", () => {
    for (const severity of ALL_SEVERITY_LEVELS) {
      const c = createContradiction({
        factAId: "fact-001",
        factBId: "fact-002",
        conflictSubject: "case-001",
        conflictPredicate: "test",
        factAValue: "a",
        factBValue: "b",
        severity,
        provenance: { level: "user_provided" },
      });
      assert.equal(c.severity, severity);
    }
  });

  test("SEVERITY_WEIGHT values are deterministic", () => {
    assert.equal(SEVERITY_WEIGHT.critical, 3);
    assert.equal(SEVERITY_WEIGHT.major, 2);
    assert.equal(SEVERITY_WEIGHT.minor, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICATE CLASSIFICATION (FALSE POSITIVE SAFETY)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Predicate Classification", () => {
  test("singular predicates are classified as confirmed", () => {
    assert.equal(classifyPredicate("has_deadline"), "confirmed");
    assert.equal(classifyPredicate("deadline"), "confirmed");
    assert.equal(classifyPredicate("response_deadline"), "confirmed");
    assert.equal(classifyPredicate("has_amount"), "confirmed");
    assert.equal(classifyPredicate("amount"), "confirmed");
    assert.equal(classifyPredicate("debt_amount"), "confirmed");
    assert.equal(classifyPredicate("debt_owed"), "confirmed");
    assert.equal(classifyPredicate("eligibility"), "confirmed");
    assert.equal(classifyPredicate("status"), "confirmed");
  });

  test("multi-valued predicates are classified as potential", () => {
    assert.equal(classifyPredicate("address"), "potential");
    assert.equal(classifyPredicate("previous_address"), "potential");
    assert.equal(classifyPredicate("phone"), "potential");
    assert.equal(classifyPredicate("email"), "potential");
    assert.equal(classifyPredicate("employer"), "potential");
    assert.equal(classifyPredicate("income"), "potential");
    assert.equal(classifyPredicate("name"), "potential");
  });

  test("unknown predicates default to potential (conservative)", () => {
    assert.equal(classifyPredicate("custom_field_xyz"), "potential");
    assert.equal(classifyPredicate("some_new_predicate"), "potential");
  });

  test("classification is case-insensitive", () => {
    assert.equal(classifyPredicate("HAS_DEADLINE"), "confirmed");
    assert.equal(classifyPredicate("Address"), "potential");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION TESTS — FALSE POSITIVE SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Detection — False Positive Safety", () => {
  test("confirmed contradiction for deadline (singular predicate)", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "case-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "conflict-detector" });

    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "confirmed");
    assert.equal(contradictions[0]!.severity, "critical");
  });

  test("potential contradiction for address (multi-valued predicate)", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "person-001", predicate: "address", value: "123 Main St", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "person-001", predicate: "address", value: "456 Oak Ave", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "conflict-detector" });

    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "potential");
    assert.equal(contradictions[0]!.severity, "major");
  });

  test("no contradiction when values are the same", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "user_provided" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 0);
  });

  test("no contradiction when predicates differ (address vs previous_address)", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "person-001", predicate: "address", value: "123 Main St", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "person-001", predicate: "previous_address", value: "456 Oak Ave", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 0); // Different predicates, not a contradiction
  });

  test("no contradiction when subjects differ", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "case-002", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 0); // Different subjects, not a contradiction
  });

  test("unknown predicate defaults to potential", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "entity-001", predicate: "custom_field", value: "val1", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "entity-001", predicate: "custom_field", value: "val2", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "potential");
    assert.equal(contradictions[0]!.severity, "major");
  });

  test("multiple conflicting pairs in same group", () => {
    const facts = [
      createFact({ id: "f1", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "f2", subject: "case-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted" } }),
      createFact({ id: "f3", subject: "case-001", predicate: "has_deadline", value: "2026-09-25", provenance: { level: "user_provided" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    // 3 facts → 3 pairs (f1-f2, f1-f3, f2-f3)
    assert.equal(contradictions.length, 3);
    for (const c of contradictions) {
      assert.equal(c.detectionType, "confirmed");
      assert.equal(c.severity, "critical");
    }
  });

  test("detection is deterministic — same input, same output", () => {
    const facts = [
      createFact({ id: "fact-A", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "fact-B", subject: "case-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted" } }),
    ];

    const run1 = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    const run2 = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });

    assert.equal(run1.length, run2.length);
    assert.equal(run1[0]!.factAId, run2[0]!.factAId);
    assert.equal(run1[0]!.factBId, run2[0]!.factBId);
    assert.equal(run1[0]!.detectionType, run2[0]!.detectionType);
    assert.equal(run1[0]!.severity, run2[0]!.severity);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE SAFETY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Resource Safety", () => {
  test("rejects fact sets exceeding MAX_FACTS_FOR_DETECTION", () => {
    const facts: ReturnType<typeof createFact>[] = [];
    for (let i = 0; i < MAX_FACTS_FOR_DETECTION + 1; i++) {
      facts.push(createFact({
        id: `f-${i}`,
        subject: `case-${i % 100}`,
        predicate: "has_deadline",
        value: `2026-09-${i % 28 + 1}`,
        provenance: { level: "user_provided" },
      }));
    }

    assert.throws(
      () => detectContradictions(facts, { level: "rule_derived", ruleId: "detector" }),
      /max is/,
    );
  });

  test("limits pairwise contradictions per group to MAX_PAIRS_PER_GROUP", () => {
    // Create 20 facts with same subject+predicate but different values
    // 20 facts → 20*19/2 = 190 pairs, but limit is 50
    const facts: ReturnType<typeof createFact>[] = [];
    for (let i = 0; i < 20; i++) {
      facts.push(createFact({
        id: `f-${i}`,
        subject: "case-001",
        predicate: "has_deadline",
        value: `2026-09-${i + 1}`,
        provenance: { level: "user_provided" },
      }));
    }

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.ok(contradictions.length <= MAX_PAIRS_PER_GROUP, `got ${contradictions.length}, max ${MAX_PAIRS_PER_GROUP}`);
    assert.ok(contradictions.length > 0);
  });

  test("handles empty fact array gracefully", () => {
    const contradictions = detectContradictions([], { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW AND RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Review", () => {
  test("reviewContradiction marks as reviewed", () => {
    const c = createContradiction({
      factAId: "fact-001", factBId: "fact-002",
      conflictSubject: "case-001", conflictPredicate: "has_deadline",
      factAValue: "2026-09-15", factBValue: "2026-09-20",
      severity: "critical", detectionType: "confirmed",
      provenance: { level: "rule_derived", ruleId: "detector" },
    });

    const reviewed = reviewContradiction(c, "attorney@example.com");
    assert.equal(reviewed.reviewStatus, "reviewed");
    assert.equal(reviewed.reviewedBy, "attorney@example.com");
  });

  test("resolveContradiction marks as resolved with resolution type", () => {
    const c = createContradiction({
      factAId: "fact-001", factBId: "fact-002",
      conflictSubject: "case-001", conflictPredicate: "has_deadline",
      factAValue: "2026-09-15", factBValue: "2026-09-20",
      severity: "critical", detectionType: "confirmed",
      provenance: { level: "rule_derived", ruleId: "detector" },
    });

    const resolved = resolveContradiction(c, "factA_accepted", "attorney@example.com");
    assert.equal(resolved.reviewStatus, "resolved");
    assert.equal(resolved.resolution, "factA_accepted");
    assert.equal(resolved.reviewedBy, "attorney@example.com");
    assert.equal(resolved.verified, true);
    assert.equal(resolved.provenance.level, "human_verified");
  });

  test("resolveContradiction supports all resolution types", () => {
    const base = createContradiction({
      factAId: "fact-001", factBId: "fact-002",
      conflictSubject: "case-001", conflictPredicate: "test",
      factAValue: "a", factBValue: "b",
      severity: "major",
      provenance: { level: "user_provided" },
    });

    for (const resolution of ["factA_accepted", "factB_accepted", "both_preserved", "both_rejected"] as const) {
      const resolved = resolveContradiction(base, resolution, "reviewer");
      assert.equal(resolved.resolution, resolution);
      assert.equal(resolved.reviewStatus, "resolved");
    }
  });

  test("review status queries work correctly", () => {
    const c = createContradiction({
      factAId: "fact-001", factBId: "fact-002",
      conflictSubject: "case-001", conflictPredicate: "test",
      factAValue: "a", factBValue: "b",
      severity: "minor",
      provenance: { level: "user_provided" },
    });

    assert.equal(isUnreviewed(c), true);
    assert.equal(isReviewed(c), false);
    assert.equal(isResolved(c), false);

    const reviewed = reviewContradiction(c, "reviewer");
    assert.equal(isUnreviewed(reviewed), false);
    assert.equal(isReviewed(reviewed), true);

    const resolved = resolveContradiction(c, "both_preserved", "reviewer");
    assert.equal(isResolved(resolved), true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY AND DETECTION TYPE QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Queries", () => {
  test("isConfirmed/isPotential", () => {
    const confirmed = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "has_deadline",
      factAValue: "1", factBValue: "2", severity: "critical", detectionType: "confirmed",
      provenance: { level: "user_provided" },
    });
    const potential = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "address",
      factAValue: "1", factBValue: "2", severity: "major", detectionType: "potential",
      provenance: { level: "user_provided" },
    });

    assert.equal(isConfirmed(confirmed), true);
    assert.equal(isPotential(potential), true);
    assert.equal(isConfirmed(potential), false);
    assert.equal(isPotential(confirmed), false);
  });

  test("criticalContradictions filters unresolved critical", () => {
    const c1 = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "has_deadline",
      factAValue: "1", factBValue: "2", severity: "critical",
      provenance: { level: "user_provided" },
    });
    const c2 = resolveContradiction(
      createContradiction({
        factAId: "c", factBId: "d", conflictSubject: "s", conflictPredicate: "has_deadline",
        factAValue: "3", factBValue: "4", severity: "critical",
        provenance: { level: "user_provided" },
      }),
      "factA_accepted", "reviewer",
    );

    const result = criticalContradictions([c1, c2]);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.id, c1.id);
  });

  test("confirmedContradictions and potentialContradictions filter correctly", () => {
    const confirmed = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "has_deadline",
      factAValue: "1", factBValue: "2", severity: "critical", detectionType: "confirmed",
      provenance: { level: "user_provided" },
    });
    const potential = createContradiction({
      factAId: "c", factBId: "d", conflictSubject: "s", conflictPredicate: "address",
      factAValue: "3", factBValue: "4", severity: "major", detectionType: "potential",
      provenance: { level: "user_provided" },
    });

    assert.equal(confirmedContradictions([confirmed, potential]).length, 1);
    assert.equal(potentialContradictions([confirmed, potential]).length, 1);
  });

  test("contradictionsForFact finds contradictions involving a fact", () => {
    const c1 = createContradiction({
      factAId: "fact-001", factBId: "fact-002",
      conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "major",
      provenance: { level: "user_provided" },
    });
    const c2 = createContradiction({
      factAId: "fact-003", factBId: "fact-001",
      conflictSubject: "s", conflictPredicate: "p",
      factAValue: "3", factBValue: "1", severity: "minor",
      provenance: { level: "user_provided" },
    });
    const c3 = createContradiction({
      factAId: "fact-004", factBId: "fact-005",
      conflictSubject: "s", conflictPredicate: "p",
      factAValue: "4", factBValue: "5", severity: "major",
      provenance: { level: "user_provided" },
    });

    const result = contradictionsForFact([c1, c2, c3], createId("fact-001"));
    assert.equal(result.length, 2);
  });

  test("unresolvedContradictions filters out resolved", () => {
    const c1 = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "major",
      provenance: { level: "user_provided" },
    });
    const c2 = resolveContradiction(
      createContradiction({
        factAId: "c", factBId: "d", conflictSubject: "s", conflictPredicate: "p",
        factAValue: "3", factBValue: "4", severity: "minor",
        provenance: { level: "user_provided" },
      }),
      "both_preserved", "reviewer",
    );

    const result = unresolvedContradictions([c1, c2]);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.id, c1.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Sorting", () => {
  test("sortBySeverity puts critical first", () => {
    const minor = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "minor",
      provenance: { level: "user_provided" },
    });
    const critical = createContradiction({
      factAId: "c", factBId: "d", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "3", factBValue: "4", severity: "critical",
      provenance: { level: "user_provided" },
    });
    const major = createContradiction({
      factAId: "e", factBId: "f", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "5", factBValue: "6", severity: "major",
      provenance: { level: "user_provided" },
    });

    const sorted = sortBySeverity([minor, critical, major]);
    assert.equal(sorted[0]!.severity, "critical");
    assert.equal(sorted[1]!.severity, "major");
    assert.equal(sorted[2]!.severity, "minor");
  });

  test("sortByReviewStatus puts unreviewed first", () => {
    const unreviewed = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "major",
      provenance: { level: "user_provided" },
    });
    const resolved = resolveContradiction(
      createContradiction({
        factAId: "c", factBId: "d", conflictSubject: "s", conflictPredicate: "p",
        factAValue: "3", factBValue: "4", severity: "major",
        provenance: { level: "user_provided" },
      }),
      "both_preserved", "reviewer",
    );

    const sorted = sortByReviewStatus([resolved, unreviewed]);
    assert.equal(sorted[0]!.reviewStatus, "unreviewed");
    assert.equal(sorted[1]!.reviewStatus, "resolved");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Validation", () => {
  test("validateContradiction passes for valid contradiction", () => {
    const c = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "major",
      provenance: { level: "user_provided" },
    });
    assert.equal(validateContradiction(c).ok, true);
  });

  test("validateContradiction fails for same fact IDs", () => {
    const c = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "major",
      provenance: { level: "user_provided" },
    });
    const bad = { ...c, factBId: c.factAId };
    assert.equal(validateContradiction(bad).ok, false);
  });

  test("validateContradiction fails for invalid detectionType", () => {
    const c = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "major",
      provenance: { level: "user_provided" },
    });
    const bad = { ...c, detectionType: "invalid" as never };
    assert.equal(validateContradiction(bad).ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Contradiction Serialization", () => {
  test("Contradiction survives JSON round-trip", () => {
    const c = createContradiction({
      factAId: "fact-001",
      factBId: "fact-002",
      conflictSubject: "case-001",
      conflictPredicate: "has_deadline",
      factAValue: "2026-09-15",
      factBValue: "2026-09-20",
      severity: "critical",
      detectionType: "confirmed",
      explanation: "Two documents specify different deadlines",
      provenance: { level: "rule_derived", ruleId: "conflict-detector" },
    });

    const json = JSON.stringify(c);
    const restored = JSON.parse(json) as Contradiction;

    assert.equal(restored.factAId, c.factAId);
    assert.equal(restored.factBId, c.factBId);
    assert.equal(restored.conflictSubject, c.conflictSubject);
    assert.equal(restored.conflictPredicate, c.conflictPredicate);
    assert.equal(restored.factAValue, c.factAValue);
    assert.equal(restored.factBValue, c.factBValue);
    assert.equal(restored.severity, c.severity);
    assert.equal(restored.detectionType, c.detectionType);
    assert.equal(restored.reviewStatus, c.reviewStatus);
    assert.equal(restored.explanation, c.explanation);
    assert.equal(restored.id, c.id);
    assert.equal(restored.provenance.level, c.provenance.level);
  });

  test("resolved contradiction survives JSON round-trip", () => {
    const c = createContradiction({
      factAId: "a", factBId: "b", conflictSubject: "s", conflictPredicate: "p",
      factAValue: "1", factBValue: "2", severity: "critical", detectionType: "confirmed",
      provenance: { level: "rule_derived", ruleId: "detector" },
    });
    const resolved = resolveContradiction(c, "factA_accepted", "reviewer");

    const restored = JSON.parse(JSON.stringify(resolved)) as Contradiction;
    assert.equal(restored.reviewStatus, "resolved");
    assert.equal(restored.resolution, "factA_accepted");
    assert.equal(restored.provenance.level, "human_verified");
    assert.equal(restored.provenance.verifiedBy, "reviewer");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE + CONTRADICTION INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Evidence + Contradiction Integration", () => {
  test("contradiction with evidence supporting each side — both preserved", () => {
    const ref1 = createSourceRef({ documentId: createId("doc-1"), documentName: "denial-letter.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("doc-2"), documentName: "amendment.pdf", page: 4 });

    const factA = createFact({
      id: "fact-deadline-A",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "document_extracted", sourceRefs: [ref1] },
    });
    const factB = createFact({
      id: "fact-deadline-B",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-20",
      provenance: { level: "document_extracted", sourceRefs: [ref2] },
    });

    const evA = createEvidence({
      claimId: factA.id, relation: "supports", evidenceType: "document", evidenceId: "doc-1",
      provenance: { level: "document_extracted", sourceRefs: [ref1] },
    });
    const evB = createEvidence({
      claimId: factB.id, relation: "supports", evidenceType: "document", evidenceId: "doc-2",
      provenance: { level: "document_extracted", sourceRefs: [ref2] },
    });

    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "conflict-detector" });
    assert.equal(contradictions.length, 1);
    const c = contradictions[0]!;
    assert.equal(c.detectionType, "confirmed");
    assert.equal(c.severity, "critical");

    // Both sides have evidence — neither is auto-rejected
    const allEvidence = [evA, evB];
    const evalA = evaluateEvidence(evidenceForClaim(allEvidence, factA.id));
    const evalB = evaluateEvidence(evidenceForClaim(allEvidence, factB.id));

    assert.equal(evalA.isSupported, true);
    assert.equal(evalB.isSupported, true);

    // Human resolves
    const resolved = resolveContradiction(c, "factA_accepted", "attorney");
    assert.equal(resolved.resolution, "factA_accepted");
    assert.equal(resolved.verified, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Contradiction Scenarios", () => {
  test("Appeal Mail: conflicting deadlines from denial vs amendment", () => {
    const facts = [
      createFact({ id: "f1", subject: "appeal-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "f2", subject: "appeal-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "confirmed");
    assert.equal(contradictions[0]!.severity, "critical");
  });

  test("Immigration Mail: conflicting filing dates", () => {
    const facts = [
      createFact({ id: "f1", subject: "imm-case-001", predicate: "filing_date", value: "2026-01-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "f2", subject: "imm-case-001", predicate: "filing_date", value: "2026-01-20", provenance: { level: "user_provided" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "confirmed");
    assert.equal(contradictions[0]!.severity, "critical");
  });

  test("Dispute Mail: conflicting debt amounts", () => {
    const facts = [
      createFact({ id: "f1", subject: "account-1234", predicate: "debt_amount", value: "$3,450", provenance: { level: "document_extracted" } }),
      createFact({ id: "f2", subject: "account-1234", predicate: "debt_amount", value: "$2,100", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "confirmed");
    assert.equal(contradictions[0]!.severity, "critical");
  });

  test("Notice Respond: potential address conflict (not a false positive)", () => {
    const facts = [
      createFact({ id: "f1", subject: "respondent-001", predicate: "address", value: "123 Main St", provenance: { level: "document_extracted" } }),
      createFact({ id: "f2", subject: "respondent-001", predicate: "address", value: "456 Oak Ave", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.detectionType, "potential"); // Not confirmed — might be historical
    assert.equal(contradictions[0]!.severity, "major"); // Not critical
  });

  test("Appeal Mail: non-contradictory historical addresses", () => {
    // Two different predicates — not a contradiction
    const facts = [
      createFact({ id: "f1", subject: "claimant-001", predicate: "address", value: "123 Main St", provenance: { level: "document_extracted" } }),
      createFact({ id: "f2", subject: "claimant-001", predicate: "previous_address", value: "456 Oak Ave", provenance: { level: "document_extracted" } }),
    ];

    const contradictions = detectContradictions(facts, { level: "rule_derived", ruleId: "detector" });
    assert.equal(contradictions.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE: NO VERTICAL-SPECIFIC BRANCHES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: No Vertical-Specific Branches", () => {
  test("all verticals use the same detectContradictions function", () => {
    const appealFacts = [
      createFact({ id: "af1", subject: "appeal-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "af2", subject: "appeal-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted" } }),
    ];
    const immFacts = [
      createFact({ id: "if1", subject: "imm-001", predicate: "filing_date", value: "2026-01-15", provenance: { level: "document_extracted" } }),
      createFact({ id: "if2", subject: "imm-001", predicate: "filing_date", value: "2026-01-20", provenance: { level: "document_extracted" } }),
    ];

    const appealContradictions = detectContradictions(appealFacts, { level: "rule_derived", ruleId: "detector" });
    const immContradictions = detectContradictions(immFacts, { level: "rule_derived", ruleId: "detector" });

    // Same function, same structure, different data
    assert.equal(appealContradictions.length, 1);
    assert.equal(immContradictions.length, 1);
    assert.equal(typeof appealContradictions[0], typeof immContradictions[0]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROVENANCE CHAIN: Document → SourceRef → Fact → Evidence → Contradiction
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Provenance Chain with Contradictions", () => {
  test("consumer can trace both sides of a contradiction to their source documents", () => {
    const ref1 = createSourceRef({ documentId: createId("doc-A"), documentName: "denial-letter.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("doc-B"), documentName: "amendment.pdf", page: 4 });

    const factA = createFact({
      id: "fact-deadline-A",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: { level: "document_extracted", sourceRefs: [ref1] },
    });
    const factB = createFact({
      id: "fact-deadline-B",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-20",
      provenance: { level: "document_extracted", sourceRefs: [ref2] },
    });

    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "conflict-detector" });
    const c = contradictions[0]!;

    // Trace factA back to its source document
    assert.equal(factA.provenance.sourceRefs[0]!.documentName, "denial-letter.pdf");
    assert.equal(factA.provenance.sourceRefs[0]!.page, 1);

    // Trace factB back to its source document
    assert.equal(factB.provenance.sourceRefs[0]!.documentName, "amendment.pdf");
    assert.equal(factB.provenance.sourceRefs[0]!.page, 4);

    // The contradiction references both facts
    assert.equal(c.factAId, factA.id);
    assert.equal(c.factBId, factB.id);
    assert.equal(c.factAValue, "2026-09-15");
    assert.equal(c.factBValue, "2026-09-20");

    // The contradiction has its own provenance (how the conflict was detected)
    assert.equal(c.provenance.level, "rule_derived");
    assert.equal(c.provenance.ruleId, "conflict-detector");
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Platform Intelligence Tests ──────────────────────────────────────────────

import {
  type EvidenceItem,
  type EvidencePacket,
  type EvidenceRelation,
  type ContradictionRecord,
  type FactInput,
  ALL_EVIDENCE_RELATIONS,
  RELATION_STRENGTH,
  PROVENANCE_WEIGHT,
  createEvidence,
  createEvidencePacket,
  activeItems,
  supportingItems,
  contradictingItems,
  missingItems,
  evaluateEvidence,
  hasContradictions,
  hasGaps,
  createContradiction,
  classifyPredicate,
  detectContradictions,
  sortBySeverity,
  unresolvedContradictions,
  criticalContradictions,
  isCritical,
  isMajor,
  isUnreviewed,
  isResolved,
  computeReadiness,
  createReadinessCheck,
  pendingActions,
  criticalActions,
  failedChecks,
  warningChecks,
  isCaseReady,
  createAuditEvent,
  RateLimiter,
  DEFAULT_RATE_LIMITS,
  createProvenance,
  type ProvenanceLevel,
} from "../src/lib/platform/intelligence";

describe("Intelligence: Evidence", () => {
  test("createEvidence produces a valid evidence item", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "document_extracted" },
      confidence: 0.9,
    });
    assert.equal(evidence.claimId, "fact-001");
    assert.equal(evidence.relation, "supports");
    assert.equal(evidence.status, "active");
    assert.equal(evidence.confidence, 0.9);
    assert.equal(evidence.verified, false);
  });

  test("createEvidence with default confidence (0.5)", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "fact",
      evidenceId: "fact-002",
      provenance: { level: "user_provided" },
    });
    assert.equal(evidence.confidence, 0.5);
  });

  test("createEvidence rejects empty claimId", () => {
    assert.throws(
      () => createEvidence({
        claimId: "",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "user_provided" },
      }),
      /claimId/,
    );
  });
});

describe("Intelligence: Evidence Evaluation", () => {
  test("evaluateEvidence with supporting items only", () => {
    const items: EvidenceItem[] = [
      createEvidence({
        claimId: "claim-1",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "document_extracted" },
        confidence: 0.9,
      }),
      createEvidence({
        claimId: "claim-1",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-2",
        provenance: { level: "human_verified" },
        confidence: 0.8,
      }),
    ];
    const packet = createEvidencePacket("claim-1", items);
    const evaluation = evaluateEvidence(packet);

    assert.equal(evaluation.supportCount, 2);
    assert.equal(evaluation.contradictCount, 0);
    assert.equal(evaluation.hasContradictions, false);
    assert.equal(evaluation.hasGaps, false);
    assert.ok(evaluation.weightedScore > 0);
    assert.ok(evaluation.summary.includes("supportive"));
  });

  test("evaluateEvidence detects contradictions", () => {
    const items: EvidenceItem[] = [
      createEvidence({
        claimId: "claim-1",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "document_extracted" },
        confidence: 0.9,
      }),
      createEvidence({
        claimId: "claim-1",
        relation: "contradicts",
        evidenceType: "document",
        evidenceId: "doc-2",
        provenance: { level: "document_extracted" },
        confidence: 0.8,
      }),
    ];
    const packet = createEvidencePacket("claim-1", items);
    const evaluation = evaluateEvidence(packet);

    assert.equal(evaluation.hasContradictions, true);
    assert.equal(evaluation.contradictCount, 1);
    assert.ok(evaluation.summary.includes("contradictory"));
  });

  test("evaluateEvidence detects gaps (missing evidence)", () => {
    const items: EvidenceItem[] = [
      createEvidence({
        claimId: "claim-1",
        relation: "missing",
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "user_provided" },
        confidence: 0.5,
      }),
    ];
    const packet = createEvidencePacket("claim-1", items);
    const evaluation = evaluateEvidence(packet);

    assert.equal(evaluation.hasGaps, true);
    assert.equal(evaluation.missingCount, 1);
  });

  test("evaluateEvidence with no items returns empty summary", () => {
    const packet = createEvidencePacket("claim-1", []);
    const evaluation = evaluateEvidence(packet);
    assert.equal(evaluation.totalItems, 0);
    assert.ok(evaluation.summary.includes("No evidence"));
  });

  test("stronger provenance produces higher weighted score", () => {
    const weakEvidence = createEvidence({
      claimId: "claim-1",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "ai_inferred" },
      confidence: 0.9,
    });
    const strongEvidence = createEvidence({
      claimId: "claim-1",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-2",
      provenance: { level: "human_verified" },
      confidence: 0.9,
    });

    const weakPacket = createEvidencePacket("claim-1", [weakEvidence]);
    const strongPacket = createEvidencePacket("claim-1", [strongEvidence]);

    const weakEval = evaluateEvidence(weakPacket);
    const strongEval = evaluateEvidence(strongPacket);

    assert.ok(strongEval.weightedScore > weakEval.weightedScore);
  });
});

describe("Intelligence: Contradiction Detection", () => {
  test("classifies singular predicates as confirmed", () => {
    assert.equal(classifyPredicate("has_deadline"), "confirmed");
    assert.equal(classifyPredicate("deadline"), "confirmed");
    assert.equal(classifyPredicate("amount"), "confirmed");
    assert.equal(classifyPredicate("decision_date"), "confirmed");
  });

  test("classifies multi-valued predicates as potential", () => {
    assert.equal(classifyPredicate("address"), "potential");
    assert.equal(classifyPredicate("phone"), "potential");
    assert.equal(classifyPredicate("employer"), "potential");
  });

  test("classifies unknown predicates as potential (safe default)", () => {
    assert.equal(classifyPredicate("favorite_color"), "potential");
  });

  test("detects contradictions between facts with same subject+predicate", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "decision", predicate: "has_deadline", value: "2026-01-15" },
      { id: "f2", subject: "decision", predicate: "has_deadline", value: "2026-02-20" },
    ];
    const contradictions = detectContradictions(facts);
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.severity, "critical"); // singular predicate → critical
    assert.equal(contradictions[0]!.detectionType, "confirmed");
  });

  test("does not flag same-value facts as contradictions", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "decision", predicate: "has_deadline", value: "2026-01-15" },
      { id: "f2", subject: "decision", predicate: "has_deadline", value: "2026-01-15" },
    ];
    const contradictions = detectContradictions(facts);
    assert.equal(contradictions.length, 0);
  });

  test("does not flag facts with different subjects as contradictions", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "decision", predicate: "has_deadline", value: "2026-01-15" },
      { id: "f2", subject: "letter", predicate: "has_deadline", value: "2026-02-20" },
    ];
    const contradictions = detectContradictions(facts);
    assert.equal(contradictions.length, 0);
  });

  test("does not flag facts with different predicates as contradictions", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "decision", predicate: "has_deadline", value: "2026-01-15" },
      { id: "f2", subject: "decision", predicate: "decision_date", value: "2026-02-20" },
    ];
    const contradictions = detectContradictions(facts);
    assert.equal(contradictions.length, 0);
  });

  test("multi-valued predicates produce 'major' severity", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "person", predicate: "address", value: "123 Main St" },
      { id: "f2", subject: "person", predicate: "address", value: "456 Oak Ave" },
    ];
    const contradictions = detectContradictions(facts);
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0]!.severity, "major");
    assert.equal(contradictions[0]!.detectionType, "potential");
  });

  test("sortBySeverity orders critical first", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "person", predicate: "address", value: "A" },
      { id: "f2", subject: "person", predicate: "address", value: "B" },
      { id: "f3", subject: "case", predicate: "has_deadline", value: "2026-01-01" },
      { id: "f4", subject: "case", predicate: "has_deadline", value: "2026-02-01" },
    ];
    const contradictions = detectContradictions(facts);
    const sorted = sortBySeverity(contradictions);
    assert.equal(sorted[0]!.severity, "critical");
  });

  test("unresolvedContradictions filters out resolved ones", () => {
    const facts: FactInput[] = [
      { id: "f1", subject: "case", predicate: "has_deadline", value: "2026-01-01" },
      { id: "f2", subject: "case", predicate: "has_deadline", value: "2026-02-01" },
    ];
    const contradictions = detectContradictions(facts);
    assert.equal(unresolvedContradictions(contradictions).length, 1);
  });
});

describe("Intelligence: Case Assessment", () => {
  test("computeReadiness with all passing checks", () => {
    const checks = [
      createReadinessCheck({ id: "1", label: "Grounds", description: "Has grounds", status: "pass" }),
      createReadinessCheck({ id: "2", label: "Evidence", description: "Has evidence", status: "pass" }),
    ];
    const result = computeReadiness(checks);
    assert.equal(result.score, 100);
    assert.equal(result.ready, true);
    assert.equal(result.issuesRequiringAttention, 0);
  });

  test("computeReadiness with failing checks", () => {
    const checks = [
      createReadinessCheck({ id: "1", label: "Grounds", description: "Has grounds", status: "fail" }),
      createReadinessCheck({ id: "2", label: "Evidence", description: "Has evidence", status: "warning" }),
    ];
    const result = computeReadiness(checks);
    assert.equal(result.score, 72); // 100 - 20 - 8
    assert.equal(result.ready, false); // has fail
    assert.equal(result.issuesRequiringAttention, 2);
  });

  test("failedChecks returns only failing checks", () => {
    const checks = [
      createReadinessCheck({ id: "1", label: "A", description: "A", status: "pass" }),
      createReadinessCheck({ id: "2", label: "B", description: "B", status: "fail" }),
      createReadinessCheck({ id: "3", label: "C", description: "C", status: "warning" }),
    ];
    assert.equal(failedChecks(checks).length, 1);
    assert.equal(warningChecks(checks).length, 1);
  });
});

describe("Intelligence: Audit Events", () => {
  test("createAuditEvent produces a valid event", () => {
    const event = createAuditEvent({
      type: "appeal.created",
      subjectId: "appeal-123",
      ownerId: "user-456",
    });
    assert.equal(event.type, "appeal.created");
    assert.equal(event.subjectId, "appeal-123");
    assert.equal(event.ownerId, "user-456");
    assert.equal(event.actor, "system");
    assert.ok(event.id);
    assert.ok(event.occurredAt);
  });

  test("createAuditEvent with custom actor", () => {
    const event = createAuditEvent({
      type: "appeal.updated",
      actor: "user",
      subjectId: "appeal-123",
      ownerId: "user-456",
      metadata: { version: 2 },
    });
    assert.equal(event.actor, "user");
    assert.deepEqual(event.metadata, { version: 2 });
  });
});

describe("Intelligence: Rate Limiting", () => {
  test("allows requests within limit", () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 3 });
    assert.equal(limiter.check("key1").allowed, true);
    assert.equal(limiter.check("key1").allowed, true);
    assert.equal(limiter.check("key1").allowed, true);
  });

  test("blocks requests exceeding limit", () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2 });
    limiter.check("key1");
    limiter.check("key1");
    const result = limiter.check("key1");
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  test("different keys have independent limits", () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1 });
    assert.equal(limiter.check("key1").allowed, true);
    assert.equal(limiter.check("key2").allowed, true);
    assert.equal(limiter.check("key1").allowed, false);
    assert.equal(limiter.check("key2").allowed, false);
  });

  test("limits are not client-bypassable (server-side state)", () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1 });
    // Client cannot reset the limiter state
    limiter.check("key1");
    assert.equal(limiter.check("key1").allowed, false);
  });

  test("reset clears the rate limit for a key", () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1 });
    limiter.check("key1");
    assert.equal(limiter.check("key1").allowed, false);
    limiter.reset("key1");
    assert.equal(limiter.check("key1").allowed, true);
  });

  test("window resets after time passes", () => {
    let currentTime = 1000;
    const limiter = new RateLimiter(
      { windowMs: 100, maxRequests: 1 },
      () => currentTime,
    );
    assert.equal(limiter.check("key1").allowed, true);
    assert.equal(limiter.check("key1").allowed, false);
    currentTime += 200; // advance past window
    assert.equal(limiter.check("key1").allowed, true);
  });
});

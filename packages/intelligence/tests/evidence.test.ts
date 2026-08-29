import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type EvidenceItem,
  type EvidencePacket,
  type EvidenceRelation,
  type EvidenceEvaluation,
  ALL_EVIDENCE_RELATIONS,
  RELATION_STRENGTH,
  PROVENANCE_WEIGHT,
  MAX_EXPLANATION_LENGTH,
  MAX_EVIDENCE_ID_LENGTH,
  MAX_EVIDENCE_ITEMS,
  createEvidence,
  verifyEvidence,
  retractEvidence,
  supersedeEvidence,
  validateEvidence,
  createEvidencePacket,
  activeItems,
  supportingItems,
  contradictingItems,
  qualifyingItems,
  missingItems,
  evaluateEvidence,
  evidenceForClaim,
  hasContradictions,
  hasGaps,
  isDuplicateEvidence,
  deduplicateEvidence,
  createId,
  createSourceRef,
  type ProvenanceLevel,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE ITEM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("EvidenceItem", () => {
  test("createEvidence produces a valid evidence item", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 2 });
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      explanation: "Page 2 explicitly states the deadline",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
      confidence: 0.9,
    });

    assert.equal(evidence.claimId, "fact-001");
    assert.equal(evidence.relation, "supports");
    assert.equal(evidence.evidenceType, "document");
    assert.equal(evidence.evidenceId, "doc-1");
    assert.equal(evidence.explanation, "Page 2 explicitly states the deadline");
    assert.equal(evidence.status, "active");
    assert.equal(evidence.confidence, 0.9);
    assert.equal(evidence.verified, false);
    assert.equal(evidence.provenance.level, "document_extracted");
    assert.equal(evidence.provenance.sourceRefs.length, 1);
    assert.equal(evidence.provenance.sourceRefs[0]!.page, 2);
    assert.ok(evidence.id);
    assert.ok(evidence.createdAt);
    assert.ok(evidence.updatedAt);
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

  test("createEvidence rejects empty evidenceId", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "",
        provenance: { level: "user_provided" },
      }),
      /evidenceId/,
    );
  });

  test("createEvidence rejects oversized evidenceId", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "x".repeat(MAX_EVIDENCE_ID_LENGTH + 1),
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("createEvidence rejects oversized explanation", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-1",
        explanation: "x".repeat(MAX_EXPLANATION_LENGTH + 1),
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("createEvidence with AI-inferred provenance requires modelId", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "fact",
        evidenceId: "fact-002",
        provenance: { level: "ai_inferred" },
      }),
      /modelId/,
    );
  });

  test("createEvidence with human_verified provenance requires verifiedBy", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "fact",
        evidenceId: "fact-002",
        provenance: { level: "human_verified" },
      }),
      /verifiedBy/,
    );
  });

  test("verifyEvidence upgrades provenance to human_verified", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "document_extracted" },
    });

    const verified = verifyEvidence(evidence, "reviewer@example.com");
    assert.equal(verified.verified, true);
    assert.equal(verified.provenance.level, "human_verified");
    assert.equal(verified.provenance.verifiedBy, "reviewer@example.com");
  });

  test("retractEvidence marks status as retracted", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "document_extracted" },
    });

    const retracted = retractEvidence(evidence);
    assert.equal(retracted.status, "retracted");
    assert.equal(retracted.claimId, evidence.claimId);
    assert.equal(retracted.relation, evidence.relation);
  });

  test("supersedeEvidence marks old as superseded and links replacement", () => {
    const old = createEvidence({
      id: "ev-old",
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const newer = createEvidence({
      id: "ev-new",
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "document_extracted" },
    });

    const { old: superseded, updated } = supersedeEvidence(old, newer);
    assert.equal(superseded.status, "superseded");
    assert.equal(superseded.supersededBy, "ev-new");
    assert.equal(updated.id, "ev-new");
  });

  test("supersedeEvidence rejects different claims", () => {
    const a = createEvidence({
      id: "ev-a",
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "user_provided" },
    });
    const b = createEvidence({
      id: "ev-b",
      claimId: "fact-002",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-2",
      provenance: { level: "user_provided" },
    });

    assert.throws(() => supersedeEvidence(a, b), /different claim/);
  });

  test("validateEvidence passes for valid item", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "document_extracted" },
    });
    const result = validateEvidence(evidence);
    assert.equal(result.ok, true);
  });

  test("validateEvidence fails for empty claimId", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "user_provided" },
    });
    const bad = { ...evidence, claimId: "" as never };
    const result = validateEvidence(bad);
    assert.equal(result.ok, false);
  });

  test("supports all four evidence relations", () => {
    for (const relation of ALL_EVIDENCE_RELATIONS) {
      const evidence = createEvidence({
        claimId: "fact-001",
        relation,
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "user_provided" },
      });
      assert.equal(evidence.relation, relation);
    }
  });

  test("supports all four evidence types", () => {
    const types = ["document", "fact", "entity", "external"] as const;
    for (const evidenceType of types) {
      const evidence = createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType,
        evidenceId: "some-id",
        provenance: { level: "user_provided" },
      });
      assert.equal(evidence.evidenceType, evidenceType);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE PACKET TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("EvidencePacket", () => {
  test("createEvidencePacket groups items for a single claim", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "document_extracted" } }),
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "fact", evidenceId: "fact-003", provenance: { level: "rule_derived", ruleId: "deadline-calc" } }),
    ];

    const packet = createEvidencePacket("fact-001", items);
    assert.equal(packet.claimId, "fact-001");
    assert.equal(packet.items.length, 3);
  });

  test("createEvidencePacket rejects items for different claims", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-002", relation: "supports", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" } }),
    ];

    assert.throws(() => createEvidencePacket("fact-001", items), /fact-002/);
  });

  test("createEvidencePacket enforces max items limit", () => {
    const items: EvidenceItem[] = [];
    for (let i = 0; i < MAX_EVIDENCE_ITEMS + 1; i++) {
      items.push(
        createEvidence({
          claimId: "fact-001",
          relation: "supports",
          evidenceType: "document",
          evidenceId: `doc-${i}`,
          provenance: { level: "user_provided" },
        }),
      );
    }

    assert.throws(() => createEvidencePacket("fact-001", items), /exceeds/);
  });

  test("query functions filter by relation", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "document_extracted" } }),
      createEvidence({ claimId: "fact-001", relation: "qualifies", evidenceType: "fact", evidenceId: "fact-003", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-001", relation: "missing", evidenceType: "document", evidenceId: "doc-missing", provenance: { level: "rule_derived", ruleId: "expected-doc" } }),
    ];
    const packet = createEvidencePacket("fact-001", items);

    assert.equal(supportingItems(packet).length, 1);
    assert.equal(contradictingItems(packet).length, 1);
    assert.equal(qualifyingItems(packet).length, 1);
    assert.equal(missingItems(packet).length, 1);
    assert.equal(activeItems(packet).length, 4);
  });

  test("query functions exclude retracted items", () => {
    const active = createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } });
    const retracted = retractEvidence(
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" } }),
    );
    const packet = createEvidencePacket("fact-001", [active, retracted]);

    assert.equal(activeItems(packet).length, 1);
    assert.equal(supportingItems(packet).length, 1);
    assert.equal(packet.items.length, 2); // retracted still in items, just filtered
  });

  test("hasContradictions detects contradicting evidence", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" } }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    assert.equal(hasContradictions(packet), true);
  });

  test("hasContradictions returns false when no contradictions", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    assert.equal(hasContradictions(packet), false);
  });

  test("hasGaps detects missing evidence", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-001", relation: "missing", evidenceType: "document", evidenceId: "doc-missing", provenance: { level: "rule_derived", ruleId: "expected" } }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    assert.equal(hasGaps(packet), true);
  });

  test("evidenceForClaim filters from a larger set", () => {
    const all: EvidenceItem[] = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-002", relation: "supports", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-3", provenance: { level: "user_provided" } }),
    ];
    const packet = evidenceForClaim(all, createId("fact-001"));
    assert.equal(packet.items.length, 2);
    assert.equal(packet.claimId, "fact-001");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE EVALUATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("EvidenceEvaluation", () => {
  test("empty packet produces zero evaluation", () => {
    const packet = createEvidencePacket("fact-001", []);
    const eval_ = evaluateEvidence(packet);

    assert.equal(eval_.netSupport, 0);
    assert.equal(eval_.supportStrength, 0);
    assert.equal(eval_.supportingCount, 0);
    assert.equal(eval_.contradictingCount, 0);
    assert.equal(eval_.isSupported, false);
    assert.equal(eval_.isContradicted, false);
    assert.equal(eval_.hasGaps, false);
    assert.equal(eval_.evidenceQuality, 0);
  });

  test("single supporting item produces positive netSupport", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    const eval_ = evaluateEvidence(packet);

    // relStrength(1.0) × confidence(0.9) × provWeight(0.9) = 0.81
    assert.equal(eval_.netSupport, 0.81);
    assert.equal(eval_.supportStrength, 1);
    assert.equal(eval_.supportingCount, 1);
    assert.equal(eval_.contradictingCount, 0);
    assert.equal(eval_.isSupported, true);
    assert.equal(eval_.isContradicted, false);
  });

  test("single contradicting item produces negative netSupport", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    const eval_ = evaluateEvidence(packet);

    assert.ok(eval_.netSupport < 0);
    assert.equal(eval_.isContradicted, true);
    assert.equal(eval_.isSupported, false);
    assert.equal(eval_.contradictingCount, 1);
  });

  test("human_verified evidence weighs more than ai_inferred", () => {
    const aiItems = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "fact", evidenceId: "fact-002", provenance: { level: "ai_inferred", modelId: "claude-4" }, confidence: 0.9 }),
    ];
    const humanItems = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "fact", evidenceId: "fact-002", provenance: { level: "human_verified", verifiedBy: "reviewer" }, confidence: 0.9 }),
    ];

    const aiEval = evaluateEvidence(createEvidencePacket("fact-001", aiItems));
    const humanEval = evaluateEvidence(createEvidencePacket("fact-001", humanItems));

    assert.ok(humanEval.netSupport > aiEval.netSupport, "human-verified should weigh more");
    assert.ok(humanEval.evidenceQuality > aiEval.evidenceQuality, "human-verified should have higher quality");
  });

  test("mixed supporting and contradicting produces intermediate score", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" }, confidence: 0.5 }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    const eval_ = evaluateEvidence(packet);

    // supports: 1.0 × 0.9 × 0.9 = 0.81
    // contradicts: -1.0 × 0.5 × 0.5 = -0.25
    // net = 0.81 - 0.25 = 0.56
    assert.equal(eval_.netSupport, 0.56);
    assert.equal(eval_.supportingCount, 1);
    assert.equal(eval_.contradictingCount, 1);
    // isSupported requires no contradictions
    assert.equal(eval_.isSupported, false);
    assert.equal(eval_.isContradicted, false); // net is still positive
  });

  test("qualifying item contributes moderate positive", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "qualifies", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.8 }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    const eval_ = evaluateEvidence(packet);

    // 0.5 × 0.8 × 0.9 = 0.36
    assert.equal(eval_.netSupport, 0.36);
    assert.equal(eval_.qualifyingCount, 1);
  });

  test("missing item contributes zero but counts as gap", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 }),
      createEvidence({ claimId: "fact-001", relation: "missing", evidenceType: "document", evidenceId: "doc-missing", provenance: { level: "rule_derived", ruleId: "expected" }, confidence: 0.5 }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    const eval_ = evaluateEvidence(packet);

    // missing contributes 0.0 × weight = 0
    assert.equal(eval_.missingCount, 1);
    assert.equal(eval_.hasGaps, true);
  });

  test("evaluation is deterministic — same input, same output", () => {
    const items = [
      createEvidence({ id: "ev-1", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 }),
      createEvidence({ id: "ev-2", claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" }, confidence: 0.5 }),
    ];

    const eval1 = evaluateEvidence(createEvidencePacket("fact-001", items));
    const eval2 = evaluateEvidence(createEvidencePacket("fact-001", items));

    assert.deepEqual(eval1, eval2);
  });

  test("retracted items are excluded from evaluation", () => {
    const active = createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 });
    const retracted = retractEvidence(
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" }, confidence: 0.5 }),
    );
    const packet = createEvidencePacket("fact-001", [active, retracted]);
    const eval_ = evaluateEvidence(packet);

    assert.equal(eval_.contradictingCount, 0); // retracted contradiction excluded
    assert.equal(eval_.supportingCount, 1);
    assert.equal(eval_.isSupported, true);
  });

  test("PROVENANCE_WEIGHT values are deterministic and documented", () => {
    assert.equal(PROVENANCE_WEIGHT.human_verified, 1.0);
    assert.equal(PROVENANCE_WEIGHT.document_extracted, 0.9);
    assert.equal(PROVENANCE_WEIGHT.external_source, 0.7);
    assert.equal(PROVENANCE_WEIGHT.rule_derived, 0.7);
    assert.equal(PROVENANCE_WEIGHT.user_provided, 0.5);
    assert.equal(PROVENANCE_WEIGHT.ai_inferred, 0.3);
  });

  test("RELATION_STRENGTH values are deterministic", () => {
    assert.equal(RELATION_STRENGTH.supports, 1.0);
    assert.equal(RELATION_STRENGTH.contradicts, -1.0);
    assert.equal(RELATION_STRENGTH.qualifies, 0.5);
    assert.equal(RELATION_STRENGTH.missing, 0.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Evidence Deduplication", () => {
  test("isDuplicateEvidence detects same claim/source/relation", () => {
    const a = createEvidence({ id: "ev-1", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "ai_inferred", modelId: "m" } });
    const b = createEvidence({ id: "ev-2", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } });

    assert.equal(isDuplicateEvidence(a, b), true);
  });

  test("isDuplicateEvidence distinguishes different relations", () => {
    const a = createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } });
    const b = createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } });

    assert.equal(isDuplicateEvidence(a, b), false);
  });

  test("deduplicateEvidence keeps stronger provenance", () => {
    const weak = createEvidence({ id: "ev-weak", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "ai_inferred", modelId: "m" } });
    const strong = createEvidence({ id: "ev-strong", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } });

    const result = deduplicateEvidence([weak, strong]);
    assert.equal(result.length, 1);
    assert.equal(result[0]!.id, "ev-strong");
  });

  test("deduplicateEvidence preserves non-duplicates", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" } }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } }),
    ];

    const result = deduplicateEvidence(items);
    assert.equal(result.length, 3); // all different
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Evidence Serialization", () => {
  test("EvidenceItem survives JSON round-trip", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 3 });
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      explanation: "Page 3 has the deadline",
      provenance: { level: "document_extracted", sourceRefs: [ref] },
      confidence: 0.85,
    });

    const json = JSON.stringify(evidence);
    const restored = JSON.parse(json) as EvidenceItem;

    assert.equal(restored.claimId, evidence.claimId);
    assert.equal(restored.relation, evidence.relation);
    assert.equal(restored.evidenceType, evidence.evidenceType);
    assert.equal(restored.evidenceId, evidence.evidenceId);
    assert.equal(restored.explanation, evidence.explanation);
    assert.equal(restored.status, evidence.status);
    assert.equal(restored.confidence, evidence.confidence);
    assert.equal(restored.provenance.level, evidence.provenance.level);
    assert.equal(restored.provenance.sourceRefs.length, 1);
    assert.equal(restored.provenance.sourceRefs[0]!.page, 3);
    assert.equal(restored.id, evidence.id);
    assert.equal(restored.createdAt, evidence.createdAt);
  });

  test("verified evidence survives JSON round-trip", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "document_extracted" },
    });
    const verified = verifyEvidence(evidence, "admin@example.com");

    const restored = JSON.parse(JSON.stringify(verified)) as EvidenceItem;
    assert.equal(restored.verified, true);
    assert.equal(restored.provenance.level, "human_verified");
    assert.equal(restored.provenance.verifiedBy, "admin@example.com");
  });

  test("superseded evidence survives JSON round-trip", () => {
    const old = createEvidence({ id: "ev-old", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "user_provided" } });
    const newer = createEvidence({ id: "ev-new", claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } });
    const { old: superseded } = supersedeEvidence(old, newer);

    const restored = JSON.parse(JSON.stringify(superseded)) as EvidenceItem;
    assert.equal(restored.status, "superseded");
    assert.equal(restored.supersededBy, "ev-new");
  });

  test("EvidencePacket survives JSON round-trip", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" } }),
      createEvidence({ claimId: "fact-001", relation: "contradicts", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "user_provided" } }),
    ];
    const packet = createEvidencePacket("fact-001", items);

    const restored = JSON.parse(JSON.stringify(packet)) as EvidencePacket;
    assert.equal(restored.claimId, packet.claimId);
    assert.equal(restored.items.length, 2);
    assert.equal(restored.items[0]!.relation, "supports");
    assert.equal(restored.items[1]!.relation, "contradicts");
  });

  test("EvidenceEvaluation survives JSON round-trip", () => {
    const items = [
      createEvidence({ claimId: "fact-001", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted" }, confidence: 0.9 }),
    ];
    const packet = createEvidencePacket("fact-001", items);
    const eval_ = evaluateEvidence(packet);

    const restored = JSON.parse(JSON.stringify(eval_)) as EvidenceEvaluation;
    assert.equal(restored.netSupport, eval_.netSupport);
    assert.equal(restored.supportStrength, eval_.supportStrength);
    assert.equal(restored.supportingCount, eval_.supportingCount);
    assert.equal(restored.isSupported, eval_.isSupported);
    assert.equal(restored.evidenceQuality, eval_.evidenceQuality);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Evidence Security", () => {
  test("rejects malformed relation", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "invalid_relation" as EvidenceRelation,
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "user_provided" },
      }),
      /Invalid evidence relation/,
    );
  });

  test("rejects whitespace-only claimId", () => {
    assert.throws(
      () => createEvidence({
        claimId: "   ",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-1",
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("rejects whitespace-only evidenceId", () => {
    assert.throws(
      () => createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "   ",
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("AI-inferred evidence is not auto-trusted", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "fact",
      evidenceId: "fact-002",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
      confidence: 0.95, // high confidence but low trust
    });

    assert.equal(evidence.verified, false);
    assert.equal(evidence.provenance.level, "ai_inferred");

    const packet = createEvidencePacket("fact-001", [evidence]);
    const eval_ = evaluateEvidence(packet);

    // Even with 0.95 confidence, ai_inferred provenance weight is only 0.3
    // netSupport = 1.0 × 0.95 × 0.3 = 0.285
    assert.ok(eval_.netSupport < 0.3, "AI evidence should have low net support despite high confidence");
    assert.ok(eval_.evidenceQuality < 0.3, "AI evidence quality should be low");
  });

  test("human-verified evidence is trusted", () => {
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: { level: "human_verified", verifiedBy: "reviewer" },
      confidence: 0.7,
    });

    assert.equal(evidence.verified, true);

    const packet = createEvidencePacket("fact-001", [evidence]);
    const eval_ = evaluateEvidence(packet);

    // netSupport = 1.0 × 0.7 × 1.0 = 0.7
    assert.equal(eval_.netSupport, 0.7);
    assert.equal(eval_.evidenceQuality, 0.7);
  });

  test("large packet is rejected before evaluation", () => {
    const items: EvidenceItem[] = [];
    for (let i = 0; i < MAX_EVIDENCE_ITEMS; i++) {
      items.push(
        createEvidence({
          claimId: "fact-001",
          relation: "supports",
          evidenceType: "document",
          evidenceId: `doc-${i}`,
          provenance: { level: "user_provided" },
        }),
      );
    }
    // At the limit should work
    const packet = createEvidencePacket("fact-001", items);
    assert.equal(packet.items.length, MAX_EVIDENCE_ITEMS);

    // Over the limit should throw
    items.push(
      createEvidence({
        claimId: "fact-001",
        relation: "supports",
        evidenceType: "document",
        evidenceId: "doc-overflow",
        provenance: { level: "user_provided" },
      }),
    );
    assert.throws(() => createEvidencePacket("fact-001", items), /exceeds/);
  });
});

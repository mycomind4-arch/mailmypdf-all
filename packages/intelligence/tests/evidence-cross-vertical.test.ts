import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createId,
  createSourceRef,
  createEntity,
  createFact,
  createRelationship,
  createEvidence,
  createEvidencePacket,
  evaluateEvidence,
  evidenceForClaim,
  hasContradictions,
  hasGaps,
  supportingItems,
  missingItems,
  contradictingItems,
  traverseBFS,
  type Entity,
  type Fact,
  type Relationship,
  type EvidenceItem,
  type EvidenceEvaluation,
  type ProvenanceLevel,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL EVIDENCE INTEGRATION TESTS
//
// Proves the same Evidence primitives can represent evidence structures
// across multiple verticals without any vertical-specific branching.
//
// Each fixture builds a full chain:
//   Document → SourceRef → Entity → Fact → Evidence → Relationship → Evaluation
// ═══════════════════════════════════════════════════════════════════════════════

function buildProvenance(level: ProvenanceLevel, sourceRef: ReturnType<typeof createSourceRef>, opts?: { modelId?: string; verifiedBy?: string; ruleId?: string }) {
  return {
    level,
    sourceRefs: [sourceRef],
    ...(opts?.modelId ? { modelId: opts.modelId } : {}),
    ...(opts?.verifiedBy ? { verifiedBy: opts.verifiedBy } : {}),
    ...(opts?.ruleId ? { ruleId: opts.ruleId } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Evidence: Appeal Mail", () => {
  test("appeal deadline evidence from denial letter", () => {
    const ref = createSourceRef({ documentId: createId("appeal-denial-001"), documentName: "denial-letter.pdf", page: 1 });

    const agency = createEntity({
      id: "entity-ssa",
      type: "government_agency",
      name: "Social Security Administration",
      aliases: ["SSA"],
      provenance: buildProvenance("document_extracted", ref),
    });

    const fact = createFact({
      id: "fact-appeal-deadline",
      subject: "appeal-case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.95,
    });

    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "appeal-denial-001",
      explanation: "Page 1 states the 60-day appeal deadline",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.95,
    });

    const relationship = createRelationship({
      fromType: "fact",
      fromId: fact.id,
      toType: "evidence",
      toId: evidence.id,
      type: "supported_by",
      provenance: buildProvenance("document_extracted", ref),
    });

    const packet = createEvidencePacket(fact.id, [evidence]);
    const eval_ = evaluateEvidence(packet);

    assert.equal(fact.value, "2026-09-15");
    assert.equal(evidence.relation, "supports");
    assert.equal(evidence.provenance.sourceRefs[0]!.page, 1);
    assert.equal(evidence.provenance.sourceRefs[0]!.documentName, "denial-letter.pdf");
    assert.ok(eval_.isSupported);
    assert.ok(eval_.evidenceQuality > 0.8);
  });

  test("appeal with conflicting deadline evidence from different documents", () => {
    const ref1 = createSourceRef({ documentId: createId("doc-1"), documentName: "denial-letter.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("doc-2"), documentName: "amendment-notice.pdf", page: 4 });

    const factA = createFact({
      id: "fact-appeal-deadline-A",
      subject: "appeal-case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: buildProvenance("document_extracted", ref1),
    });

    const factB = createFact({
      id: "fact-appeal-deadline-B",
      subject: "appeal-case-001",
      predicate: "has_deadline",
      value: "2026-09-20",
      provenance: buildProvenance("document_extracted", ref2),
    });

    const ev1 = createEvidence({
      claimId: factA.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: buildProvenance("document_extracted", ref1),
    });

    const ev2 = createEvidence({
      claimId: factB.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-2",
      provenance: buildProvenance("document_extracted", ref2),
    });

    // Both facts and their evidence are preserved — no auto-resolution
    assert.equal(factA.value, "2026-09-15");
    assert.equal(factB.value, "2026-09-20");

    const evalA = evaluateEvidence(createEvidencePacket(factA.id, [ev1]));
    const evalB = evaluateEvidence(createEvidencePacket(factB.id, [ev2]));

    assert.equal(evalA.isSupported, true);
    assert.equal(evalB.isSupported, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Evidence: Immigration Mail", () => {
  test("RFE response evidence from USCIS notice", () => {
    const ref = createSourceRef({ documentId: createId("uscis-rfe-001"), documentName: "rfe-notice.pdf", page: 2 });

    const agency = createEntity({
      id: "entity-uscis",
      type: "government_agency",
      name: "USCIS",
      aliases: ["U.S. Citizenship and Immigration Services"],
      provenance: buildProvenance("document_extracted", ref),
    });

    const fact = createFact({
      id: "fact-imm-requires-evidence",
      subject: "immigration-case-001",
      predicate: "requires_evidence",
      value: "marriage_certificate",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.92,
    });

    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "uscis-rfe-001",
      explanation: "Page 2 requests a marriage certificate",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.92,
    });

    const packet = createEvidencePacket(fact.id, [evidence]);
    const eval_ = evaluateEvidence(packet);

    assert.equal(agency.name, "USCIS");
    assert.equal(fact.value, "marriage_certificate");
    assert.equal(evidence.provenance.sourceRefs[0]!.page, 2);
    assert.ok(eval_.isSupported);
  });

  test("immigration filing deadline from rule", () => {
    const ref = createSourceRef({ documentId: createId("uscis-rfe-001"), documentName: "rfe-notice.pdf", page: 1 });
    const fact = createFact({
      id: "fact-imm-response-deadline",
      subject: "immigration-case-001",
      predicate: "has_response_deadline",
      value: "2026-10-15",
      provenance: buildProvenance("rule_derived", ref, { ruleId: "uscis-rfe-87-days" }),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "fact",
      evidenceId: fact.id,
      provenance: buildProvenance("rule_derived", ref, { ruleId: "uscis-rfe-87-days" }),
      confidence: 0.85,
    });

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));

    assert.equal(fact.provenance.level, "rule_derived");
    assert.equal(fact.provenance.ruleId, "uscis-rfe-87-days");
    assert.ok(eval_.netSupport > 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Evidence: Dispute Mail", () => {
  test("credit report dispute evidence", () => {
    const ref = createSourceRef({ documentId: createId("credit-report-001"), documentName: "credit-report.pdf", page: 5 });
    const bureau = createEntity({
      id: "entity-transunion",
      type: "credit_bureau",
      name: "TransUnion",
      provenance: { level: "external_source", sourceRefs: [] },
    });
    const account = createEntity({
      id: "entity-account-1234",
      type: "financial_account",
      name: "Account ending in 1234",
      provenance: { level: "user_provided", sourceRefs: [] },
    });
    const fact = createFact({
      id: "fact-dispute-account-1234",
      subject: account.id,
      predicate: "reported_as",
      value: "late_payment",
      provenance: buildProvenance("document_extracted", ref),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "contradicts",
      evidenceType: "document",
      evidenceId: "credit-report-001",
      explanation: "Page 5 shows a late payment that the customer disputes",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.9,
    });
    const relationship = createRelationship({
      fromType: "entity",
      fromId: bureau.id,
      toType: "fact",
      toId: fact.id,
      type: "reported",
      provenance: { level: "external_source", sourceRefs: [] },
    });

    assert.equal(fact.value, "late_payment");
    assert.equal(evidence.relation, "contradicts");
    assert.equal(relationship.type, "reported");

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));
    assert.equal(eval_.isContradicted, true);
    assert.equal(eval_.contradictingCount, 1);
  });

  test("dispute with supporting customer evidence", () => {
    const ref = createSourceRef({ documentId: createId("bank-statement-001"), documentName: "bank-statement.pdf", page: 1 });
    const fact = createFact({
      id: "fact-payment-on-time",
      subject: "entity-account-1234",
      predicate: "payment_status",
      value: "on_time",
      provenance: buildProvenance("document_extracted", ref),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "bank-statement-001",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.95,
      explanation: "Bank statement shows payment was made on time",
    });

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));
    assert.equal(eval_.isSupported, true);
    assert.ok(eval_.evidenceQuality > 0.8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Evidence: Notice Respond", () => {
  test("notice response deadline evidence", () => {
    const ref = createSourceRef({ documentId: createId("notice-001"), documentName: "eviction-notice.pdf", page: 1 });
    const fact = createFact({
      id: "fact-notice-deadline",
      subject: "notice-case-001",
      predicate: "has_response_deadline",
      value: "2026-08-30",
      provenance: buildProvenance("document_extracted", ref),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "notice-001",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.88,
    });

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));
    assert.ok(eval_.isSupported);
    assert.equal(eval_.supportingCount, 1);
  });

  test("missing evidence gap detection", () => {
    const ref = createSourceRef({ documentId: createId("notice-001"), documentName: "eviction-notice.pdf", page: 1 });
    const fact = createFact({
      id: "fact-notice-reply-required",
      subject: "notice-case-001",
      predicate: "requires_written_response",
      value: "true",
      provenance: buildProvenance("document_extracted", ref),
    });

    const supportingEv = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "notice-001",
      provenance: buildProvenance("document_extracted", ref),
    });
    const missingEv = createEvidence({
      claimId: fact.id,
      relation: "missing",
      evidenceType: "document",
      evidenceId: "response-letter-draft",
      provenance: { level: "rule_derived", sourceRefs: [], ruleId: "expected-response-doc" },
      explanation: "A written response letter is expected but has not been drafted",
    });

    const packet = createEvidencePacket(fact.id, [supportingEv, missingEv]);
    assert.equal(hasGaps(packet), true);
    assert.equal(missingItems(packet).length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Evidence: Small Business", () => {
  test("contract evidence for invoice verification", () => {
    const ref = createSourceRef({ documentId: createId("contract-001"), documentName: "service-agreement.pdf", page: 7 });
    const fact = createFact({
      id: "fact-contract-terms",
      subject: "contract-001",
      predicate: "payment_terms",
      value: "net_30",
      provenance: buildProvenance("document_extracted", ref),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "contract-001",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.92,
      explanation: "Page 7 states payment terms are Net 30 days",
    });

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));
    assert.ok(eval_.isSupported);
    assert.ok(eval_.evidenceQuality > 0.8);
  });

  test("AI-inferred evidence with low trust", () => {
    const ref = createSourceRef({ documentId: createId("contract-001"), documentName: "service-agreement.pdf", page: 1 });
    const fact = createFact({
      id: "fact-contract-value",
      subject: "contract-001",
      predicate: "contract_value",
      value: "$50,000",
      provenance: buildProvenance("ai_inferred", ref, { modelId: "claude-4" }),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "contract-001",
      provenance: buildProvenance("ai_inferred", ref, { modelId: "claude-4" }),
      confidence: 0.7,
    });

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));

    assert.ok(eval_.evidenceQuality < 0.3);
    assert.equal(fact.verified, false);
    assert.equal(evidence.verified, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Evidence: Debt Defense", () => {
  test("debt validation evidence", () => {
    const ref = createSourceRef({ documentId: createId("debt-letter-001"), documentName: "collection-notice.pdf", page: 1 });
    const fact = createFact({
      id: "fact-debt-amount",
      subject: "debt-case-001",
      predicate: "debt_amount",
      value: "$3,450.00",
      provenance: buildProvenance("document_extracted", ref),
    });
    const evidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "debt-letter-001",
      provenance: buildProvenance("document_extracted", ref),
      confidence: 0.9,
    });

    const eval_ = evaluateEvidence(createEvidencePacket(fact.id, [evidence]));
    assert.ok(eval_.isSupported);
  });

  test("debt defense with contradictory evidence", () => {
    const ref1 = createSourceRef({ documentId: createId("debt-letter-001"), documentName: "collection-notice.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("bank-records-001"), documentName: "bank-records.pdf", page: 12 });

    const fact = createFact({
      id: "fact-debt-owed",
      subject: "debt-case-001",
      predicate: "debt_owed",
      value: "true",
      provenance: buildProvenance("document_extracted", ref1),
    });

    const collectorEvidence = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "debt-letter-001",
      provenance: buildProvenance("document_extracted", ref1),
      confidence: 0.85,
    });
    const bankEvidence = createEvidence({
      claimId: fact.id,
      relation: "contradicts",
      evidenceType: "document",
      evidenceId: "bank-records-001",
      provenance: buildProvenance("document_extracted", ref2),
      confidence: 0.95,
      explanation: "Bank records show the debt was already paid",
    });

    const packet = createEvidencePacket(fact.id, [collectorEvidence, bankEvidence]);
    const eval_ = evaluateEvidence(packet);

    assert.equal(hasContradictions(packet), true);
    assert.equal(eval_.supportingCount, 1);
    assert.equal(eval_.contradictingCount, 1);
    assert.ok(eval_.netSupport < 0, "stronger bank evidence should make net support negative");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROVENANCE CHAIN INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Provenance Chain", () => {
  test("end-to-end chain preserves all provenance", () => {
    const sourceRef = createSourceRef({
      documentId: createId("appeal-determination-001"),
      documentName: "determination.pdf",
      page: 4,
      excerpt: "You must appeal within 60 days of this notice",
    });

    const agency = createEntity({
      id: "entity-ssa",
      type: "government_agency",
      name: "Social Security Administration",
      aliases: ["SSA"],
      provenance: buildProvenance("document_extracted", sourceRef),
    });

    const deadlineFact = createFact({
      id: "fact-appeal-deadline",
      subject: agency.id,
      predicate: "appeal_deadline",
      value: "2026-09-15",
      provenance: buildProvenance("document_extracted", sourceRef),
      confidence: 0.95,
    });

    const evidence = createEvidence({
      claimId: deadlineFact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "appeal-determination-001",
      explanation: "Determination letter page 4 states the 60-day appeal deadline",
      provenance: buildProvenance("document_extracted", sourceRef),
      confidence: 0.95,
    });

    const relationship = createRelationship({
      fromType: "fact",
      fromId: deadlineFact.id,
      toType: "evidence",
      toId: evidence.id,
      type: "supported_by",
      provenance: buildProvenance("document_extracted", sourceRef),
    });

    // 1. Document identity preserved
    assert.equal(sourceRef.documentId, createId("appeal-determination-001"));
    assert.equal(sourceRef.documentName, "determination.pdf");

    // 2. Page and excerpt preserved
    assert.equal(sourceRef.page, 4);
    assert.equal(sourceRef.excerpt, "You must appeal within 60 days of this notice");

    // 3. Source type (provenance level) preserved
    assert.equal(evidence.provenance.level, "document_extracted");

    // 4. Fact → Evidence link
    assert.equal(evidence.claimId, deadlineFact.id);

    // 5. Evidence → Relationship link
    assert.equal(relationship.fromId, deadlineFact.id);
    assert.equal(relationship.toId, evidence.id);
    assert.equal(relationship.type, "supported_by");

    // 6. Evaluation works
    const packet = createEvidencePacket(deadlineFact.id, [evidence]);
    const eval_ = evaluateEvidence(packet);
    assert.ok(eval_.isSupported);
    assert.ok(eval_.evidenceQuality > 0.8);

    // 7. Graph traversal from fact reaches evidence
    const allRels: Relationship[] = [relationship];
    const reachable = traverseBFS(allRels, "fact", deadlineFact.id, 5);
    assert.ok(reachable.some((n) => n.type === "evidence" && n.id === evidence.id));
  });

  test("consumer can answer: What evidence supports this fact?", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 1 });
    const fact = createFact({
      id: "fact-test-001",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: buildProvenance("document_extracted", ref),
    });
    const ev1 = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: buildProvenance("document_extracted", ref),
    });
    const ev2 = createEvidence({
      claimId: fact.id,
      relation: "supports",
      evidenceType: "fact",
      evidenceId: "fact-calc-deadline",
      provenance: { level: "rule_derived", sourceRefs: [], ruleId: "60-day-rule" },
    });

    const allEvidence: EvidenceItem[] = [ev1, ev2];
    const packet = evidenceForClaim(allEvidence, fact.id);

    assert.equal(packet.items.length, 2);
    assert.equal(supportingItems(packet).length, 2);
  });

  test("consumer can answer: Where did this evidence originate?", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 3 });
    const evidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: buildProvenance("document_extracted", ref),
    });

    assert.equal(evidence.provenance.level, "document_extracted");
    assert.equal(evidence.provenance.sourceRefs.length, 1);
    assert.equal(evidence.provenance.sourceRefs[0]!.documentId, createId("doc-1"));
    assert.equal(evidence.provenance.sourceRefs[0]!.documentName, "notice.pdf");
    assert.equal(evidence.provenance.sourceRefs[0]!.page, 3);
  });

  test("consumer can answer: Was it AI-extracted, human-verified, or directly sourced?", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "notice.pdf", page: 1 });

    const aiEvidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "fact",
      evidenceId: "fact-ai",
      provenance: buildProvenance("ai_inferred", ref, { modelId: "claude-4" }),
    });
    const docEvidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: buildProvenance("document_extracted", ref),
    });
    const humanEvidence = createEvidence({
      claimId: "fact-001",
      relation: "supports",
      evidenceType: "document",
      evidenceId: "doc-1",
      provenance: buildProvenance("human_verified", ref, { verifiedBy: "attorney" }),
    });

    assert.equal(aiEvidence.provenance.level, "ai_inferred");
    assert.equal(aiEvidence.provenance.modelId, "claude-4");
    assert.equal(aiEvidence.verified, false);

    assert.equal(docEvidence.provenance.level, "document_extracted");
    assert.equal(docEvidence.verified, false);

    assert.equal(humanEvidence.provenance.level, "human_verified");
    assert.equal(humanEvidence.provenance.verifiedBy, "attorney");
    assert.equal(humanEvidence.verified, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE: NO VERTICAL-SPECIFIC BRANCHES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: Evidence Has No Vertical Special Cases", () => {
  test("all verticals use the same createEvidence function", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "test.pdf", page: 1 });

    const appealEv = createEvidence({ claimId: "fact-1", relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: buildProvenance("document_extracted", ref) });
    const immEv = createEvidence({ claimId: "fact-2", relation: "supports", evidenceType: "document", evidenceId: "doc-2", provenance: buildProvenance("document_extracted", ref) });
    const disputeEv = createEvidence({ claimId: "fact-3", relation: "contradicts", evidenceType: "document", evidenceId: "doc-3", provenance: buildProvenance("document_extracted", ref) });
    const noticeEv = createEvidence({ claimId: "fact-4", relation: "supports", evidenceType: "document", evidenceId: "doc-4", provenance: buildProvenance("document_extracted", ref) });
    const smbEv = createEvidence({ claimId: "fact-5", relation: "qualifies", evidenceType: "document", evidenceId: "doc-5", provenance: buildProvenance("document_extracted", ref) });
    const debtEv = createEvidence({ claimId: "fact-6", relation: "supports", evidenceType: "document", evidenceId: "doc-6", provenance: buildProvenance("document_extracted", ref) });

    for (const ev of [appealEv, immEv, disputeEv, noticeEv, smbEv, debtEv]) {
      assert.equal(typeof ev.claimId, "string");
      assert.equal(typeof ev.relation, "string");
      assert.equal(typeof ev.evidenceType, "string");
    }
  });
});

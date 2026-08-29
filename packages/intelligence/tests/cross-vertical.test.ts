import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createEntity,
  verifyEntity,
  createFact,
  createRelationship,
  verifyFact,
  supersedeFact,
  disputeFact,
  findConflictingFacts,
  traverseBFS,
  relationshipsFrom,
  createProvenance,
  createSourceRef,
  createId,
  type Entity,
  type Fact,
  type Relationship,
  type SourceRef,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL VALIDATION
//
// This test proves that the same generic primitives (Entity, Fact, Relationship)
// can represent real concepts from three different verticals:
//
//   1. APPEAL MAIL — appeal process against a government decision
//   2. IMMIGRATION MAIL — responding to USCIS correspondence
//   3. DISPUTE MAIL — disputing a credit report error
//
// No vertical-specific hacks. No `if vertical === ...` branches.
// The same createEntity, createFact, createRelationship calls work for all three.
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: create a document source reference
function docRef(docId: string, name: string, page?: number): SourceRef {
  const ref = page !== undefined
    ? createSourceRef({ documentId: createId(docId), documentName: name, page })
    : createSourceRef({ documentId: createId(docId), documentName: name });
  return ref;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPEAL MAIL SCENARIO
//
// A person received a decision from an agency. They want to appeal.
// Key concepts: Person, Agency, Decision, Deadline, Ground, Evidence
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical: Appeal Mail", () => {
  test("Person → submitted → Appeal; Agency → issued → Decision; Decision → establishes → Deadline", () => {
    // Entities
    const person = createEntity({
      id: "appeal-person",
      type: "person",
      name: "John Smith",
      provenance: { level: "user_provided" },
    });

    const agency = createEntity({
      id: "appeal-agency",
      type: "government_agency",
      name: "County Board of Equalization",
      provenance: { level: "user_provided" },
    });

    const decision = createEntity({
      id: "appeal-decision",
      type: "decision",
      name: "Assessment Appeal Decision #2026-042",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("doc-001", "decision-letter.pdf", 1)],
      },
      confidence: 0.95,
    });

    // Facts extracted from the decision
    const decisionDate = createFact({
      id: "appeal-fact-date",
      subject: "appeal-decision",
      predicate: "decided_on",
      value: "2026-07-01",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("doc-001", "decision-letter.pdf", 1)],
      },
      confidence: 0.95,
    });

    const deadline = createFact({
      id: "appeal-fact-deadline",
      subject: "appeal-decision",
      predicate: "appeal_deadline",
      value: "2026-07-31",
      provenance: {
        level: "rule_derived",
        sourceRefs: [docRef("doc-001", "decision-letter.pdf", 1)],
        ruleId: "appeal-window-30-days",
      },
      confidence: 0.9,
    });

    // Relationships
    const submittedRel = createRelationship({
      fromType: "entity",
      fromId: "appeal-person",
      toType: "entity",
      toId: "appeal-decision",
      type: "submitted",
      provenance: { level: "user_provided" },
    });

    const issuedRel = createRelationship({
      fromType: "entity",
      fromId: "appeal-agency",
      toType: "entity",
      toId: "appeal-decision",
      type: "issued",
      provenance: { level: "document_extracted", sourceRefs: [docRef("doc-001", "decision-letter.pdf", 1)] },
    });

    // Verify the chain
    assert.equal(person.name, "John Smith");
    assert.equal(agency.type, "government_agency");
    assert.equal(decisionDate.value, "2026-07-01");
    assert.equal(deadline.value, "2026-07-31");
    assert.equal(deadline.provenance.level, "rule_derived");
    assert.ok(deadline.provenance.ruleId);

    // Graph traversal: from person, can we reach the decision?
    const allRels = [submittedRel, issuedRel];
    const fromPerson = relationshipsFrom(allRels, "entity", createId("appeal-person"));
    assert.equal(fromPerson.length, 1);
    assert.equal(fromPerson[0]!.toId, "appeal-decision");
  });

  test("AI-inferred deadline can be superseded by document-extracted deadline", () => {
    const aiDeadline = createFact({
      id: "appeal-ai-deadline",
      subject: "appeal-case-001",
      predicate: "appeal_deadline",
      value: "2026-08-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
      confidence: 0.6,
    });

    const docDeadline = createFact({
      id: "appeal-doc-deadline",
      subject: "appeal-case-001",
      predicate: "appeal_deadline",
      value: "2026-07-31",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("doc-001", "decision-letter.pdf", 3)],
      },
      confidence: 0.95,
    });

    const { old, updated } = supersedeFact(aiDeadline, docDeadline);

    // Old fact is preserved, not destroyed
    assert.equal(old.status, "superseded");
    assert.equal(old.value, "2026-08-15"); // AI's guess preserved
    assert.equal(old.supersededBy, "appeal-doc-deadline");

    // New fact is active
    assert.equal(updated.status, "active");
    assert.equal(updated.value, "2026-07-31");
    assert.equal(updated.provenance.level, "document_extracted");

    // Conflict detection finds nothing now (old is superseded)
    const conflicts = findConflictingFacts([old, updated]);
    assert.equal(conflicts.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IMMIGRATION MAIL SCENARIO
//
// An applicant received a Request for Evidence (RFE) from USCIS.
// Key concepts: Applicant, Agency, Notice, Deadline, Form
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical: Immigration Mail", () => {
  test("Agency → issued → Notice; Notice → concerns → Applicant; Notice → requires → Form", () => {
    const applicant = createEntity({
      id: "imm-applicant",
      type: "person",
      name: "Maria Rodriguez",
      aliases: ["M. Rodriguez"],
      provenance: { level: "user_provided" },
    });

    const agency = createEntity({
      id: "imm-uscis",
      type: "government_agency",
      name: "USCIS",
      aliases: ["U.S. Citizenship and Immigration Services"],
      provenance: { level: "user_provided" },
    });

    const notice = createEntity({
      id: "imm-rfe-001",
      type: "notice",
      name: "Request for Evidence (RFE)",
      provenance: {
        level: "ai_inferred",
        sourceRefs: [docRef("imm-doc-001", "rfe-letter.pdf", 1)],
        modelId: "claude-4-sonnet",
      },
      confidence: 0.85,
    });

    // Facts from the RFE
    const receiptNumber = createFact({
      id: "imm-fact-receipt",
      subject: "imm-rfe-001",
      predicate: "receipt_number",
      value: "WAC-26-045-12345",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("imm-doc-001", "rfe-letter.pdf", 1)],
      },
      confidence: 0.99,
    });

    const responseDeadline = createFact({
      id: "imm-fact-deadline",
      subject: "imm-rfe-001",
      predicate: "response_deadline",
      value: "2026-09-15",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("imm-doc-001", "rfe-letter.pdf", 2)],
      },
      confidence: 0.9,
    });

    const requiredForm = createFact({
      id: "imm-fact-form",
      subject: "imm-rfe-001",
      predicate: "requires_form",
      value: "I-864",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("imm-doc-001", "rfe-letter.pdf", 3)],
      },
      confidence: 0.95,
    });

    // Relationships
    const issuedRel = createRelationship({
      fromType: "entity",
      fromId: "imm-uscis",
      toType: "entity",
      toId: "imm-rfe-001",
      type: "issued",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("imm-doc-001", "rfe-letter.pdf", 1)],
      },
    });

    const concernsRel = createRelationship({
      fromType: "entity",
      fromId: "imm-rfe-001",
      toType: "entity",
      toId: "imm-applicant",
      type: "concerns",
      provenance: { level: "user_provided" },
    });

    // Verify
    assert.equal(applicant.name, "Maria Rodriguez");
    assert.equal(agency.name, "USCIS");
    assert.equal(notice.name, "Request for Evidence (RFE)");
    assert.equal(notice.provenance.level, "ai_inferred");
    assert.equal(notice.provenance.modelId, "claude-4-sonnet");
    assert.equal(receiptNumber.value, "WAC-26-045-12345");
    assert.equal(responseDeadline.value, "2026-09-15");
    assert.equal(requiredForm.value, "I-864");

    // AI-inferred notice can be verified by a human
    const verifiedNotice = verifyEntity(notice, "attorney@example.com");
    assert.equal(verifiedNotice.verified, true);
    assert.equal(verifiedNotice.provenance.level, "human_verified");
  });

  test("Two documents disagree on the deadline — conflict detected", () => {
    const deadline1 = createFact({
      id: "imm-conflict-1",
      subject: "imm-rfe-001",
      predicate: "response_deadline",
      value: "2026-09-15",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("imm-doc-001", "rfe-letter.pdf", 2)],
      },
    });

    const deadline2 = createFact({
      id: "imm-conflict-2",
      subject: "imm-rfe-001",
      predicate: "response_deadline",
      value: "2026-10-15",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("imm-doc-002", "follow-up-letter.pdf", 1)],
      },
    });

    const conflicts = findConflictingFacts([deadline1, deadline2]);
    assert.equal(conflicts.length, 2);

    // Both are preserved — neither is destroyed
    const disputed1 = disputeFact(deadline1, createId("imm-conflict-2"));
    assert.equal(disputed1.status, "disputed");
    assert.equal(disputed1.disputedBy!.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DISPUTE MAIL SCENARIO
//
// A customer disputes a charge on their credit report.
// Key concepts: Customer, Creditor, Credit Bureau, Account, Charge
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical: Dispute Mail", () => {
  test("Customer → disputes → Charge; Bureau → reported → Charge; Document → supports → Fact", () => {
    const customer = createEntity({
      id: "disp-customer",
      type: "person",
      name: "Alice Johnson",
      provenance: { level: "user_provided" },
    });

    const bureau = createEntity({
      id: "disp-bureau",
      type: "credit_bureau",
      name: "Equifax",
      provenance: { level: "user_provided" },
    });

    const account = createEntity({
      id: "disp-account",
      type: "account",
      name: "Account #1234-5678",
      metadata: { last4: "5678", type: "credit_card" },
      provenance: { level: "user_provided" },
    });

    // Facts
    const disputedAmount = createFact({
      id: "disp-fact-amount",
      subject: "disp-account",
      predicate: "disputed_amount",
      value: "$1,249.00",
      provenance: { level: "user_provided" },
      confidence: 0.8,
    });

    const disputeReason = createFact({
      id: "disp-fact-reason",
      subject: "disp-account",
      predicate: "dispute_reason",
      value: "unauthorized_charge",
      provenance: { level: "user_provided" },
    });

    const reportDate = createFact({
      id: "disp-fact-reported",
      subject: "disp-account",
      predicate: "reported_on",
      value: "2026-06-15",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("disp-doc-001", "credit-report.pdf", 12)],
      },
    });

    // Relationships
    const disputesRel = createRelationship({
      fromType: "entity",
      fromId: "disp-customer",
      toType: "entity",
      toId: "disp-account",
      type: "disputes",
      provenance: { level: "user_provided" },
    });

    const reportedRel = createRelationship({
      fromType: "entity",
      fromId: "disp-bureau",
      toType: "entity",
      toId: "disp-account",
      type: "reported",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("disp-doc-001", "credit-report.pdf", 12)],
      },
    });

    // Verify
    assert.equal(customer.name, "Alice Johnson");
    assert.equal(bureau.type, "credit_bureau");
    assert.equal(account.metadata.last4, "5678");
    assert.equal(disputedAmount.value, "$1,249.00");
    assert.equal(disputeReason.value, "unauthorized_charge");
    assert.equal(reportDate.provenance.level, "document_extracted");

    // Graph: customer → account ← bureau
    const allRels = [disputesRel, reportedRel];
    const fromCustomer = relationshipsFrom(allRels, "entity", createId("disp-customer"));
    assert.equal(fromCustomer.length, 1);
    assert.equal(fromCustomer[0]!.type, "disputes");

    const toAccount = allRels.filter(
      (r) => r.status === "active" && r.toType === "entity" && r.toId === "disp-account",
    );
    assert.equal(toAccount.length, 2); // disputes + reported
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION: Document → SourceRef → Fact → Entity → Relationship
// Full provenance chain traceability test
// ═══════════════════════════════════════════════════════════════════════════════

describe("Integration: Full Provenance Chain", () => {
  test("Document → SourceRef → Fact → Entity → Relationship with complete provenance", () => {
    // 1. Source document reference
    const docSourceRef = docRef("doc-001", "notice.pdf", 2);

    // 2. Entity extracted from that document
    const agency = createEntity({
      id: "chain-agency",
      type: "government_agency",
      name: "USCIS",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docSourceRef],
      },
      confidence: 0.95,
    });

    // 3. Fact extracted from the same document
    const deadlineFact = createFact({
      id: "chain-deadline",
      subject: "chain-agency",
      predicate: "response_deadline",
      value: "2026-09-15",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docSourceRef],
      },
      confidence: 0.9,
    });

    // 4. Relationship connecting them
    const hasDeadlineRel = createRelationship({
      fromType: "entity",
      fromId: "chain-agency",
      toType: "fact",
      toId: "chain-deadline",
      type: "has_deadline",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docSourceRef],
      },
    });

    // ── Traceability assertions ──────────────────────────────────────────────

    // Entity → source → document
    assert.equal(agency.provenance.sourceRefs.length, 1);
    assert.equal(agency.provenance.sourceRefs[0]!.documentId, "doc-001");
    assert.equal(agency.provenance.sourceRefs[0]!.documentName, "notice.pdf");
    assert.equal(agency.provenance.sourceRefs[0]!.page, 2);

    // Fact → source → same document
    assert.equal(deadlineFact.provenance.sourceRefs.length, 1);
    assert.equal(deadlineFact.provenance.sourceRefs[0]!.documentId, "doc-001");
    assert.equal(deadlineFact.provenance.sourceRefs[0]!.page, 2);

    // Relationship → source → same document
    assert.equal(hasDeadlineRel.provenance.sourceRefs.length, 1);
    assert.equal(hasDeadlineRel.provenance.sourceRefs[0]!.documentId, "doc-001");

    // All three objects trace back to the SAME document
    const allSources = [
      ...agency.provenance.sourceRefs,
      ...deadlineFact.provenance.sourceRefs,
      ...hasDeadlineRel.provenance.sourceRefs,
    ];
    const docIds = new Set(allSources.map((s) => s.documentId));
    assert.equal(docIds.size, 1); // All point to the same document
    assert.ok(docIds.has(createId("doc-001")));

    // Provenance levels are consistent
    assert.equal(agency.provenance.level, "document_extracted");
    assert.equal(deadlineFact.provenance.level, "document_extracted");
    assert.equal(hasDeadlineRel.provenance.level, "document_extracted");

    // Confidence is separate from provenance (different values are fine)
    assert.equal(agency.confidence, 0.95);
    assert.equal(deadlineFact.confidence, 0.9);

    // Graph traversal: from agency, can reach the deadline fact
    const reachable = traverseBFS([hasDeadlineRel], "entity", createId("chain-agency"));
    assert.equal(reachable.length, 2); // agency + fact
    assert.equal(reachable[1]!.type, "fact");
    assert.equal(reachable[1]!.id, "chain-deadline");
  });

  test("AI-inferred fact cannot silently become verified", () => {
    // AI extracts a fact
    const aiFact = createFact({
      id: "chain-ai-fact",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-08-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });

    // Fact starts unverified
    assert.equal(aiFact.verified, false);
    assert.equal(aiFact.provenance.level, "ai_inferred");

    // The ONLY way to verify is explicit human action
    const verifiedFact = verifyFact(aiFact, "user@example.com");
    assert.equal(verifiedFact.verified, true);
    assert.equal(verifiedFact.provenance.level, "human_verified");
    assert.equal(verifiedFact.provenance.verifiedBy, "user@example.com");

    // Original AI fact remains unverified (immutability)
    assert.equal(aiFact.verified, false);
    assert.equal(aiFact.provenance.level, "ai_inferred");
  });

  test("Append-only history: superseded facts preserve full audit trail", () => {
    const v1 = createFact({
      id: "chain-v1",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-08-15",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
      confidence: 0.5,
    });

    const v2 = createFact({
      id: "chain-v2",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-15",
      provenance: {
        level: "document_extracted",
        sourceRefs: [docRef("doc-001", "notice.pdf", 2)],
      },
      confidence: 0.95,
    });

    const v3 = createFact({
      id: "chain-v3",
      subject: "case-001",
      predicate: "has_deadline",
      value: "2026-09-30",
      provenance: {
        level: "human_verified",
        sourceRefs: [docRef("doc-002", "amended-notice.pdf", 1)],
        verifiedBy: "attorney@example.com",
      },
      confidence: 1.0,
    });

    // Chain: v1 → superseded by v2 → superseded by v3
    const { old: old1, updated: updated1 } = supersedeFact(v1, v2);
    const { old: old2, updated: final } = supersedeFact(updated1, v3);

    // v1 is superseded, points to v2
    assert.equal(old1.status, "superseded");
    assert.equal(old1.supersededBy, "chain-v2");
    assert.equal(old1.value, "2026-08-15"); // Original AI guess preserved

    // v2 is superseded, points to v3
    assert.equal(old2.status, "superseded");
    assert.equal(old2.supersededBy, "chain-v3");
    assert.equal(old2.value, "2026-09-15");

    // v3 is active and verified
    assert.equal(final.status, "active");
    assert.equal(final.value, "2026-09-30");
    assert.equal(final.verified, true);
    assert.equal(final.provenance.level, "human_verified");

    // Full history preserved
    const allFacts = [old1, old2, final];
    assert.equal(allFacts.length, 3);
    assert.equal(allFacts[0]!.provenance.level, "ai_inferred"); // v1 was AI
    assert.equal(allFacts[1]!.provenance.level, "document_extracted"); // v2 was extracted
    assert.equal(allFacts[2]!.provenance.level, "human_verified"); // v3 was verified
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE: No vertical-specific special cases
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: No Vertical Special Cases", () => {
  test("same createEntity call works for all three verticals without branching", () => {
    // These all use the same function, same types, no special cases
    const appealEntity = createEntity({ type: "government_agency", name: "Board of Equalization", provenance: { level: "user_provided" } });
    const immigrationEntity = createEntity({ type: "government_agency", name: "USCIS", provenance: { level: "user_provided" } });
    const disputeEntity = createEntity({ type: "credit_bureau", name: "Equifax", provenance: { level: "user_provided" } });

    // All have the same shape
    assert.equal(typeof appealEntity.id, "string");
    assert.equal(typeof immigrationEntity.id, "string");
    assert.equal(typeof disputeEntity.id, "string");

    // Entity types are open — platform doesn't validate against a fixed list
    assert.equal(appealEntity.type, "government_agency");
    assert.equal(immigrationEntity.type, "government_agency");
    assert.equal(disputeEntity.type, "credit_bureau");
  });

  test("same createFact call works for all three verticals without branching", () => {
    const appealFact = createFact({ subject: "decision-001", predicate: "appeal_deadline", value: "2026-07-31", provenance: { level: "rule_derived", ruleId: "30-day-window" } });
    const immigrationFact = createFact({ subject: "rfe-001", predicate: "response_deadline", value: "2026-09-15", provenance: { level: "document_extracted" } });
    const disputeFact = createFact({ subject: "account-001", predicate: "disputed_amount", value: "$1,249.00", provenance: { level: "user_provided" } });

    // All have the same shape — subject, predicate, value, provenance
    assert.ok(appealFact.subject && appealFact.predicate && appealFact.value);
    assert.ok(immigrationFact.subject && immigrationFact.predicate && immigrationFact.value);
    assert.ok(disputeFact.subject && disputeFact.predicate && disputeFact.value);
  });

  test("same createRelationship call works for all three verticals without branching", () => {
    const appealRel = createRelationship({ fromType: "entity", fromId: "person-001", toType: "entity", toId: "decision-001", type: "submitted", provenance: { level: "user_provided" } });
    const immigrationRel = createRelationship({ fromType: "entity", fromId: "uscis-001", toType: "entity", toId: "rfe-001", type: "issued", provenance: { level: "document_extracted" } });
    const disputeRel = createRelationship({ fromType: "entity", fromId: "customer-001", toType: "entity", toId: "account-001", type: "disputes", provenance: { level: "user_provided" } });

    // All have the same shape — from, to, type, provenance
    assert.ok(appealRel.fromId && appealRel.toId && appealRel.type);
    assert.ok(immigrationRel.fromId && immigrationRel.toId && immigrationRel.type);
    assert.ok(disputeRel.fromId && disputeRel.toId && disputeRel.type);
  });
});

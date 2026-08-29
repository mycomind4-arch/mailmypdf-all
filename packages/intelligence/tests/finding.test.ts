import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type Finding,
  type FindingSeverity,
  ALL_FINDING_SEVERITIES,
  FINDING_SEVERITY_WEIGHT,
  MAX_FINDING_TYPE_LENGTH,
  MAX_FINDING_EXPLANATION_LENGTH,
  MAX_RECOMMENDED_ACTION_LENGTH,
  MAX_DERIVATION_REFS,
  createFinding,
  verifyFinding,
  supersedeFinding,
  retractFinding,
  validateFinding,
  isFindingActive,
  isFindingSuperseded,
  isFindingRetracted,
  isFindingCritical,
  isFindingMajor,
  isFindingMinor,
  isFindingInfo,
  findingsForEntity,
  findingsForFact,
  criticalFindings,
  unresolvedFindings,
  sortFindingsBySeverity,
  sortFindingsByConfidence,
  createFact,
  createEvidence,
  createContradiction,
  createEntity,
  createSourceRef,
  createId,
  detectContradictions,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FINDING ITEM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Item", () => {
  test("createFinding produces a valid finding with full derivation chain", () => {
    const f = createFinding({
      findingType: "date_conflict",
      severity: "critical",
      factIds: ["fact-001", "fact-002"],
      evidenceIds: ["ev-001", "ev-002"],
      contradictionIds: ["con-001"],
      entityIds: ["entity-001"],
      explanation: "Two documents specify different deadlines for the same appeal",
      recommendedAction: "Verify which deadline is correct by contacting the agency",
      provenance: { level: "rule_derived", ruleId: "xray-detector" },
      confidence: 0.85,
    });

    assert.equal(f.findingType, "date_conflict");
    assert.equal(f.severity, "critical");
    assert.equal(f.status, "active");
    assert.equal(f.factIds.length, 2);
    assert.equal(f.evidenceIds.length, 2);
    assert.equal(f.contradictionIds.length, 1);
    assert.equal(f.entityIds.length, 1);
    assert.equal(f.explanation, "Two documents specify different deadlines for the same appeal");
    assert.equal(f.recommendedAction, "Verify which deadline is correct by contacting the agency");
    assert.equal(f.confidence, 0.85);
    assert.equal(f.verified, false);
    assert.ok(f.id);
  });

  test("createFinding with default confidence (0.6)", () => {
    const f = createFinding({
      findingType: "missing_reference",
      severity: "minor",
      provenance: { level: "user_provided" },
    });
    assert.equal(f.confidence, 0.6);
    assert.equal(f.factIds.length, 0);
    assert.equal(f.evidenceIds.length, 0);
  });

  test("createFinding rejects empty findingType", () => {
    assert.throws(
      () => createFinding({
        findingType: "",
        severity: "major",
        provenance: { level: "user_provided" },
      }),
      /findingType/,
    );
  });

  test("createFinding rejects oversized findingType", () => {
    assert.throws(
      () => createFinding({
        findingType: "x".repeat(MAX_FINDING_TYPE_LENGTH + 1),
        severity: "major",
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("createFinding rejects invalid severity", () => {
    assert.throws(
      () => createFinding({
        findingType: "test",
        severity: "invalid" as FindingSeverity,
        provenance: { level: "user_provided" },
      }),
      /severity/,
    );
  });

  test("createFinding rejects oversized explanation", () => {
    assert.throws(
      () => createFinding({
        findingType: "test",
        severity: "minor",
        explanation: "x".repeat(MAX_FINDING_EXPLANATION_LENGTH + 1),
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("createFinding rejects oversized recommendedAction", () => {
    assert.throws(
      () => createFinding({
        findingType: "test",
        severity: "minor",
        recommendedAction: "x".repeat(MAX_RECOMMENDED_ACTION_LENGTH + 1),
        provenance: { level: "user_provided" },
      }),
    );
  });

  test("createFinding rejects too many fact references", () => {
    const factIds = Array.from({ length: MAX_DERIVATION_REFS + 1 }, (_, i) => `f-${i}`);
    assert.throws(
      () => createFinding({
        findingType: "test",
        severity: "major",
        factIds,
        provenance: { level: "user_provided" },
      }),
      /factIds/,
    );
  });

  test("supports all severity levels", () => {
    for (const severity of ALL_FINDING_SEVERITIES) {
      const f = createFinding({
        findingType: "test",
        severity,
        provenance: { level: "user_provided" },
      });
      assert.equal(f.severity, severity);
    }
  });

  test("FINDING_SEVERITY_WEIGHT values are deterministic", () => {
    assert.equal(FINDING_SEVERITY_WEIGHT.critical, 4);
    assert.equal(FINDING_SEVERITY_WEIGHT.major, 3);
    assert.equal(FINDING_SEVERITY_WEIGHT.minor, 2);
    assert.equal(FINDING_SEVERITY_WEIGHT.info, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION AND LIFECYCLE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Lifecycle", () => {
  test("verifyFinding upgrades provenance to human_verified", () => {
    const f = createFinding({
      findingType: "date_conflict",
      severity: "critical",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    assert.equal(f.verified, false);

    const verified = verifyFinding(f, "attorney@example.com");
    assert.equal(verified.verified, true);
    assert.equal(verified.provenance.level, "human_verified");
    assert.equal(verified.provenance.verifiedBy, "attorney@example.com");
  });

  test("supersedeFinding marks old as superseded and links replacement", () => {
    const old = createFinding({
      id: "f-old",
      findingType: "date_conflict",
      severity: "critical",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });
    const newer = createFinding({
      id: "f-new",
      findingType: "date_conflict",
      severity: "critical",
      provenance: { level: "document_extracted" },
    });

    const { old: superseded, updated } = supersedeFinding(old, newer);
    assert.equal(superseded.status, "superseded");
    assert.equal(superseded.supersededBy, "f-new");
    assert.equal(updated.id, "f-new");
  });

  test("supersedeFinding rejects different finding types", () => {
    const a = createFinding({
      id: "f-a",
      findingType: "date_conflict",
      severity: "critical",
      provenance: { level: "user_provided" },
    });
    const b = createFinding({
      id: "f-b",
      findingType: "missing_reference",
      severity: "minor",
      provenance: { level: "user_provided" },
    });

    assert.throws(() => supersedeFinding(a, b), /finding type/);
  });

  test("retractFinding marks as retracted", () => {
    const f = createFinding({
      findingType: "test",
      severity: "minor",
      provenance: { level: "user_provided" },
    });
    const retracted = retractFinding(f);
    assert.equal(retracted.status, "retracted");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Queries", () => {
  test("status queries", () => {
    const f = createFinding({ findingType: "t", severity: "major", provenance: { level: "user_provided" } });
    assert.equal(isFindingActive(f), true);
    assert.equal(isFindingSuperseded(f), false);
    assert.equal(isFindingRetracted(f), false);
  });

  test("severity queries", () => {
    assert.equal(isFindingCritical(createFinding({ findingType: "t", severity: "critical", provenance: { level: "user_provided" } })), true);
    assert.equal(isFindingMajor(createFinding({ findingType: "t", severity: "major", provenance: { level: "user_provided" } })), true);
    assert.equal(isFindingMinor(createFinding({ findingType: "t", severity: "minor", provenance: { level: "user_provided" } })), true);
    assert.equal(isFindingInfo(createFinding({ findingType: "t", severity: "info", provenance: { level: "user_provided" } })), true);
  });

  test("findingsForEntity filters by entity and active status", () => {
    const f1 = createFinding({ findingType: "t", severity: "major", entityIds: ["ent-1"], provenance: { level: "user_provided" } });
    const f2 = createFinding({ findingType: "t", severity: "major", entityIds: ["ent-2"], provenance: { level: "user_provided" } });
    const f3 = retractFinding(createFinding({ findingType: "t", severity: "major", entityIds: ["ent-1"], provenance: { level: "user_provided" } }));

    const result = findingsForEntity([f1, f2, f3], createId("ent-1"));
    assert.equal(result.length, 1);
  });

  test("findingsForFact filters by fact reference", () => {
    const f1 = createFinding({ findingType: "t", severity: "major", factIds: ["fact-1"], provenance: { level: "user_provided" } });
    const f2 = createFinding({ findingType: "t", severity: "major", factIds: ["fact-2"], provenance: { level: "user_provided" } });

    const result = findingsForFact([f1, f2], createId("fact-1"));
    assert.equal(result.length, 1);
  });

  test("criticalFindings returns only active critical", () => {
    const f1 = createFinding({ findingType: "t", severity: "critical", provenance: { level: "user_provided" } });
    const f2 = createFinding({ findingType: "t", severity: "major", provenance: { level: "user_provided" } });
    const f3 = retractFinding(createFinding({ findingType: "t", severity: "critical", provenance: { level: "user_provided" } }));

    const result = criticalFindings([f1, f2, f3]);
    assert.equal(result.length, 1);
  });

  test("unresolvedFindings returns active unverified", () => {
    const f1 = createFinding({ findingType: "t", severity: "major", provenance: { level: "ai_inferred", modelId: "m" } });
    const f2 = verifyFinding(createFinding({ findingType: "t", severity: "major", provenance: { level: "user_provided" } }), "reviewer");

    const result = unresolvedFindings([f1, f2]);
    assert.equal(result.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Sorting", () => {
  test("sortFindingsBySeverity puts critical first", () => {
    const info = createFinding({ findingType: "t", severity: "info", provenance: { level: "user_provided" } });
    const critical = createFinding({ findingType: "t", severity: "critical", provenance: { level: "user_provided" } });
    const major = createFinding({ findingType: "t", severity: "major", provenance: { level: "user_provided" } });

    const sorted = sortFindingsBySeverity([info, critical, major]);
    assert.equal(sorted[0]!.severity, "critical");
    assert.equal(sorted[1]!.severity, "major");
    assert.equal(sorted[2]!.severity, "info");
  });

  test("sortFindingsByConfidence puts highest first", () => {
    const low = createFinding({ findingType: "t", severity: "major", confidence: 0.3, provenance: { level: "user_provided" } });
    const high = createFinding({ findingType: "t", severity: "major", confidence: 0.9, provenance: { level: "user_provided" } });

    const sorted = sortFindingsByConfidence([low, high]);
    assert.equal(sorted[0]!.confidence, 0.9);
    assert.equal(sorted[1]!.confidence, 0.3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Validation", () => {
  test("validateFinding passes for valid finding", () => {
    const f = createFinding({ findingType: "test", severity: "major", provenance: { level: "user_provided" } });
    assert.equal(validateFinding(f).ok, true);
  });

  test("validateFinding fails for empty findingType", () => {
    const f = createFinding({ findingType: "test", severity: "major", provenance: { level: "user_provided" } });
    const bad = { ...f, findingType: "" };
    assert.equal(validateFinding(bad).ok, false);
  });

  test("validateFinding fails for invalid severity", () => {
    const f = createFinding({ findingType: "test", severity: "major", provenance: { level: "user_provided" } });
    const bad = { ...f, severity: "invalid" as never };
    assert.equal(validateFinding(bad).ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Serialization", () => {
  test("Finding survives JSON round-trip", () => {
    const f = createFinding({
      findingType: "date_conflict",
      severity: "critical",
      factIds: ["fact-001", "fact-002"],
      evidenceIds: ["ev-001"],
      contradictionIds: ["con-001"],
      entityIds: ["ent-001"],
      explanation: "Two documents specify different deadlines",
      recommendedAction: "Verify with agency",
      provenance: { level: "rule_derived", ruleId: "detector" },
      confidence: 0.85,
    });

    const restored = JSON.parse(JSON.stringify(f)) as Finding;
    assert.equal(restored.findingType, f.findingType);
    assert.equal(restored.severity, f.severity);
    assert.equal(restored.factIds.length, 2);
    assert.equal(restored.evidenceIds.length, 1);
    assert.equal(restored.contradictionIds.length, 1);
    assert.equal(restored.entityIds.length, 1);
    assert.equal(restored.explanation, f.explanation);
    assert.equal(restored.recommendedAction, f.recommendedAction);
    assert.equal(restored.confidence, f.confidence);
    assert.equal(restored.id, f.id);
    assert.equal(restored.provenance.level, f.provenance.level);
  });

  test("verified finding survives JSON round-trip", () => {
    const f = createFinding({ findingType: "test", severity: "major", provenance: { level: "user_provided" } });
    const verified = verifyFinding(f, "reviewer");
    const restored = JSON.parse(JSON.stringify(verified)) as Finding;
    assert.equal(restored.verified, true);
    assert.equal(restored.provenance.level, "human_verified");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Finding Security", () => {
  test("AI-inferred finding is not auto-trusted", () => {
    const f = createFinding({
      findingType: "unsupported_conclusion",
      severity: "major",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
      confidence: 0.95, // high confidence, low trust
    });

    assert.equal(f.verified, false);
    assert.equal(f.provenance.level, "ai_inferred");
  });

  test("human-verified finding is trusted", () => {
    const f = createFinding({
      findingType: "date_conflict",
      severity: "critical",
      provenance: { level: "human_verified", verifiedBy: "attorney" },
    });

    assert.equal(f.verified, true);
  });

  test("AI finding requires modelId", () => {
    assert.throws(
      () => createFinding({
        findingType: "test",
        severity: "major",
        provenance: { level: "ai_inferred" },
      }),
      /modelId/,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Finding Scenarios", () => {
  test("Appeal Mail: date_conflict finding from contradiction", () => {
    const ref1 = createSourceRef({ documentId: createId("doc-1"), documentName: "denial.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("doc-2"), documentName: "amendment.pdf", page: 4 });

    const factA = createFact({ id: "f-A", subject: "appeal-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted", sourceRefs: [ref1] } });
    const factB = createFact({ id: "f-B", subject: "appeal-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted", sourceRefs: [ref2] } });

    const evA = createEvidence({ claimId: factA.id, relation: "supports", evidenceType: "document", evidenceId: "doc-1", provenance: { level: "document_extracted", sourceRefs: [ref1] } });
    const evB = createEvidence({ claimId: factB.id, relation: "supports", evidenceType: "document", evidenceId: "doc-2", provenance: { level: "document_extracted", sourceRefs: [ref2] } });

    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "xray" });
    const c = contradictions[0]!;

    const finding = createFinding({
      findingType: "date_conflict",
      severity: "critical",
      factIds: [factA.id, factB.id],
      evidenceIds: [evA.id, evB.id],
      contradictionIds: [c.id],
      entityIds: [],
      explanation: "Two documents specify different appeal deadlines",
      recommendedAction: "Contact SSA to confirm the correct deadline",
      provenance: { level: "rule_derived", ruleId: "xray-detector" },
    });

    // Full derivation chain preserved
    assert.equal(finding.factIds.length, 2);
    assert.equal(finding.evidenceIds.length, 2);
    assert.equal(finding.contradictionIds.length, 1);
    assert.equal(finding.severity, "critical");
    assert.equal(finding.verified, false);
  });

  test("Immigration Mail: missing_document finding", () => {
    const finding = createFinding({
      findingType: "missing_document",
      severity: "major",
      factIds: ["fact-requires-evidence"],
      explanation: "RFE requests marriage certificate but it has not been uploaded",
      recommendedAction: "Upload the marriage certificate before the response deadline",
      provenance: { level: "rule_derived", ruleId: "rfe-checker" },
    });

    assert.equal(finding.findingType, "missing_document");
    assert.equal(finding.severity, "major");
  });

  test("Dispute Mail: account_error finding", () => {
    const finding = createFinding({
      findingType: "account_error",
      severity: "critical",
      factIds: ["fact-late-payment", "fact-on-time"],
      evidenceIds: ["ev-bank-statement"],
      entityIds: ["entity-account-1234"],
      explanation: "Credit report shows late payment but bank records show on-time payment",
      provenance: { level: "ai_inferred", modelId: "claude-4" },
    });

    assert.equal(finding.findingType, "account_error");
    assert.equal(finding.verified, false);
    assert.equal(finding.provenance.level, "ai_inferred");
  });

  test("Notice Respond: deadline_approaching finding", () => {
    const finding = createFinding({
      findingType: "deadline_approaching",
      severity: "critical",
      factIds: ["fact-notice-deadline"],
      explanation: "Response deadline is in 3 days",
      recommendedAction: "Draft and submit response immediately",
      provenance: { level: "rule_derived", ruleId: "deadline-monitor" },
    });

    assert.equal(finding.severity, "critical");
  });

  test("Small Business: contract_strength finding (info severity)", () => {
    const finding = createFinding({
      findingType: "case_strength",
      severity: "info",
      factIds: ["fact-payment-terms"],
      evidenceIds: ["ev-contract"],
      explanation: "Contract clearly states Net 30 payment terms with signed agreement",
      provenance: { level: "document_extracted" },
    });

    assert.equal(finding.severity, "info");
    assert.equal(isFindingInfo(finding), true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE: NO VERTICAL-SPECIFIC BRANCHES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: No Vertical-Specific Branches in Finding", () => {
  test("all verticals use the same createFinding function with different findingType strings", () => {
    const appealFinding = createFinding({ findingType: "date_conflict", severity: "critical", provenance: { level: "user_provided" } });
    const immFinding = createFinding({ findingType: "missing_document", severity: "major", provenance: { level: "user_provided" } });
    const disputeFinding = createFinding({ findingType: "account_error", severity: "critical", provenance: { level: "user_provided" } });
    const noticeFinding = createFinding({ findingType: "deadline_approaching", severity: "critical", provenance: { level: "user_provided" } });

    // All are the same type with different findingType strings
    for (const f of [appealFinding, immFinding, disputeFinding, noticeFinding]) {
      assert.equal(typeof f.findingType, "string");
      assert.equal(typeof f.severity, "string");
      assert.equal(typeof f.status, "string");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL INTELLIGENCE STACK INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Intelligence Stack: Fact → Evidence → Contradiction → Finding", () => {
  test("consumer can trace a finding back to its source documents", () => {
    const ref1 = createSourceRef({ documentId: createId("doc-A"), documentName: "denial.pdf", page: 1 });
    const ref2 = createSourceRef({ documentId: createId("doc-B"), documentName: "amendment.pdf", page: 4 });

    const factA = createFact({ id: "fact-A", subject: "case-001", predicate: "has_deadline", value: "2026-09-15", provenance: { level: "document_extracted", sourceRefs: [ref1] } });
    const factB = createFact({ id: "fact-B", subject: "case-001", predicate: "has_deadline", value: "2026-09-20", provenance: { level: "document_extracted", sourceRefs: [ref2] } });

    const evA = createEvidence({ claimId: factA.id, relation: "supports", evidenceType: "document", evidenceId: "doc-A", provenance: { level: "document_extracted", sourceRefs: [ref1] } });
    const evB = createEvidence({ claimId: factB.id, relation: "supports", evidenceType: "document", evidenceId: "doc-B", provenance: { level: "document_extracted", sourceRefs: [ref2] } });

    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "detector" });
    const c = contradictions[0]!;

    const finding = createFinding({
      findingType: "date_conflict",
      severity: "critical",
      factIds: [factA.id, factB.id],
      evidenceIds: [evA.id, evB.id],
      contradictionIds: [c.id],
      explanation: "Appeal deadlines conflict across documents",
      provenance: { level: "rule_derived", ruleId: "xray" },
    });

    // 1. Finding references facts
    assert.ok(finding.factIds.includes(factA.id));
    assert.ok(finding.factIds.includes(factB.id));

    // 2. Facts have source references to documents
    assert.equal(factA.provenance.sourceRefs[0]!.documentName, "denial.pdf");
    assert.equal(factA.provenance.sourceRefs[0]!.page, 1);
    assert.equal(factB.provenance.sourceRefs[0]!.documentName, "amendment.pdf");
    assert.equal(factB.provenance.sourceRefs[0]!.page, 4);

    // 3. Finding references evidence
    assert.ok(finding.evidenceIds.includes(evA.id));
    assert.ok(finding.evidenceIds.includes(evB.id));

    // 4. Finding references the contradiction
    assert.ok(finding.contradictionIds.includes(c.id));

    // 5. Contradiction references both facts
    assert.equal(c.factAId, factA.id);
    assert.equal(c.factBId, factB.id);

    // 6. Finding provenance shows how it was derived
    assert.equal(finding.provenance.level, "rule_derived");
    assert.equal(finding.provenance.ruleId, "xray");

    // 7. Finding is NOT verified — needs human review
    assert.equal(finding.verified, false);
  });
});

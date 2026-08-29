import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  type RiskAssessment,
  type RiskFactor,
  type RiskLevel,
  type RiskAssessmentInput,
  ALL_RISK_LEVELS,
  RISK_LEVEL_WEIGHT,
  MAX_FACTORS_PER_ASSESSMENT,
  computeRiskAssessment,
  validateRiskAssessment,
  isCriticalRisk,
  isHighRisk,
  isLowRisk,
  isUnknownRisk,
  criticalFactors,
  highFactors,
  explainFactor,
  explainAssessment,
  createFinding,
  createFact,
  detectContradictions,
  createEvidence,
  createSourceRef,
  createId,
  createTimelineEvent,
  createDeadlineRule,
  createTemporalConstraint,
  computeDeadline,
  getDeadlineStatus,
} from "../src/index.js";

// Helper to create a critical finding
function makeCriticalFinding(factId: string, ref?: ReturnType<typeof createSourceRef>) {
  return createFinding({
    findingType: "unsupported_claim",
    severity: "critical",
    explanation: "Critical unsupported claim",
    factIds: [factId],
    provenance: { level: "rule_derived", ruleId: "test", ...(ref ? { sourceRefs: [ref] } : {}) },
  });
}

function makeMajorFinding(factId: string) {
  return createFinding({
    findingType: "unsupported_claim",
    severity: "major",
    explanation: "Major unsupported claim",
    factIds: [factId],
    provenance: { level: "rule_derived", ruleId: "test" },
  });
}

function makeMinorFinding(factId: string) {
  return createFinding({
    findingType: "procedural_completeness",
    severity: "minor",
    explanation: "Minor issue",
    factIds: [factId],
    provenance: { level: "rule_derived", ruleId: "test" },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK LEVEL
// ═══════════════════════════════════════════════════════════════════════════════

describe("RiskLevel", () => {
  test("ALL_RISK_LEVELS includes unknown", () => {
    assert.ok(ALL_RISK_LEVELS.includes("unknown"));
    assert.equal(ALL_RISK_LEVELS.length, 5);
  });

  test("RISK_LEVEL_WEIGHT values are ordered", () => {
    assert.ok(RISK_LEVEL_WEIGHT.critical > RISK_LEVEL_WEIGHT.high);
    assert.ok(RISK_LEVEL_WEIGHT.high > RISK_LEVEL_WEIGHT.medium);
    assert.ok(RISK_LEVEL_WEIGHT.medium > RISK_LEVEL_WEIGHT.low);
    assert.equal(RISK_LEVEL_WEIGHT.unknown, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSUFFICIENT INFORMATION → UNKNOWN
// ═══════════════════════════════════════════════════════════════════════════════

describe("Insufficient Information → Unknown Risk", () => {
  test("empty inputs produce unknown risk, not low", () => {
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [] });
    assert.equal(assessment.overallRisk, "unknown");
    assert.equal(assessment.riskScore, 0);
    assert.equal(assessment.factors.length, 0);
    assert.equal(assessment.sufficientInformation, false);
    assert.ok(assessment.summary.includes("Insufficient information"));
  });

  test("low risk requires sufficient information", () => {
    const finding = makeMinorFinding(createFact({ subject: "c1", predicate: "s", value: "v", provenance: { level: "document_extracted" } }).id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    assert.equal(assessment.sufficientInformation, true);
    assert.equal(assessment.overallRisk, "low");
  });

  test("unknown risk is distinct from low risk", () => {
    const unknown = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [] });
    const fact = createFact({ subject: "c1", predicate: "s", value: "v", provenance: { level: "user_provided" } });
    const low = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: fact.id, relation: "supports", evidenceType: "document", evidenceId: "d1", provenance: { level: "document_extracted" } })],
    });
    assert.equal(unknown.overallRisk, "unknown");
    assert.equal(low.overallRisk, "low");
    assert.notEqual(unknown.overallRisk, low.overallRisk);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FACTORS — FINDINGS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Factors from Findings", () => {
  test("unresolved critical finding produces critical risk factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });

    assert.equal(assessment.overallRisk, "critical");
    assert.equal(assessment.factors.length, 1);
    assert.equal(assessment.factors[0]!.factorType, "unresolved_critical_findings");
    assert.equal(assessment.factors[0]!.severity, "critical");
    assert.equal(assessment.factors[0]!.itemCount, 1);
    assert.equal(assessment.factors[0]!.itemIds[0], finding.id);
  });

  test("unresolved major finding produces high risk factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeMajorFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });

    assert.equal(assessment.overallRisk, "high");
    assert.equal(assessment.factors[0]!.factorType, "unresolved_major_findings");
  });

  test("verified finding does NOT produce a risk factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = createFinding({
      findingType: "unsupported_claim", severity: "critical",
      explanation: "Critical finding", factIds: [fact.id],
      provenance: { level: "human_verified", verifiedBy: "reviewer" },
    });
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });

    assert.equal(assessment.factors.length, 0);
    assert.equal(assessment.overallRisk, "low");
  });

  test("retracted finding does NOT produce a risk factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = { ...makeCriticalFinding(fact.id), status: "retracted" as const };
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    assert.equal(assessment.factors.length, 0);
  });

  test("minor finding does NOT produce a risk factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeMinorFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    assert.equal(assessment.factors.length, 0);
    assert.equal(assessment.overallRisk, "low");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FACTORS — CONTRADICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Factors from Contradictions", () => {
  test("unresolved critical contradiction produces critical risk factor", () => {
    const factA = createFact({ subject: "c1", predicate: "hearing_date", value: "2026-03-20", provenance: { level: "document_extracted" } });
    const factB = createFact({ subject: "c1", predicate: "hearing_date", value: "2026-03-25", provenance: { level: "document_extracted" } });
    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "test" });
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions });

    assert.ok(assessment.factors.some((f) => f.factorType.includes("contradiction")));
    assert.equal(assessment.overallRisk, "critical");
  });

  test("resolved contradiction does NOT produce a risk factor", () => {
    const factA = createFact({ subject: "c1", predicate: "hearing_date", value: "2026-03-20", provenance: { level: "document_extracted" } });
    const factB = createFact({ subject: "c1", predicate: "hearing_date", value: "2026-03-25", provenance: { level: "document_extracted" } });
    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "test" });
    const resolved = contradictions.map((c) => ({ ...c, reviewStatus: "resolved" as const }));
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: resolved });

    assert.equal(assessment.factors.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FACTORS — DEADLINES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Factors from Deadlines", () => {
  test("missed deadline produces critical risk factor", () => {
    const event = createTimelineEvent({ caseId: "c1", eventType: "denial_issued", date: "2026-01-01", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "30-day", description: "d", triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 30, calendarType: "calendar" }),
      deadlineEventType: "deadline", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });
    const result = computeDeadline(event, rule);
    const status = getDeadlineStatus(result, "2026-08-14");
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [], deadlines: [{ result, status }] });

    assert.equal(status, "missed");
    assert.ok(assessment.factors.some((f) => f.factorType === "missed_deadlines"));
    assert.equal(assessment.overallRisk, "critical");
  });

  test("approaching deadline produces high risk factor", () => {
    const event = createTimelineEvent({ caseId: "c1", eventType: "denial_issued", date: "2026-08-01", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "20-day", description: "d", triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 20, calendarType: "calendar" }),
      deadlineEventType: "deadline", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });
    const result = computeDeadline(event, rule);
    const status = getDeadlineStatus(result, "2026-08-14");
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [], deadlines: [{ result, status }] });

    assert.equal(status, "approaching");
    assert.ok(assessment.factors.some((f) => f.factorType === "approaching_deadlines"));
    assert.equal(assessment.overallRisk, "high");
  });

  test("pending deadline does NOT produce a risk factor", () => {
    const event = createTimelineEvent({ caseId: "c1", eventType: "denial_issued", date: "2026-08-01", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "365-day", description: "d", triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 365, calendarType: "calendar" }),
      deadlineEventType: "deadline", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });
    const result = computeDeadline(event, rule);
    const status = getDeadlineStatus(result, "2026-08-14");
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [], deadlines: [{ result, status }] });

    assert.equal(status, "pending");
    assert.equal(assessment.factors.length, 0);
  });

  test("risk engine does NOT recalculate deadlines — consumes DeadlineEngine output", () => {
    const event = createTimelineEvent({ caseId: "c1", eventType: "denial_issued", date: "2026-07-17", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "60-day", description: "d", triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
      deadlineEventType: "deadline", authority: "a", version: "v",
      provenance: { level: "user_provided" },
    });
    const result = computeDeadline(event, rule);
    // Pass "missed" even if it might not be — proves risk engine trusts the status
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [], deadlines: [{ result, status: "missed" }] });
    assert.ok(assessment.factors.some((f) => f.factorType === "missed_deadlines"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FACTORS — INSUFFICIENT EVIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Factors from Insufficient Evidence", () => {
  test("more findings than evidence produces insufficient_evidence factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeMajorFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [], evidenceItems: [] });
    assert.ok(assessment.factors.some((f) => f.factorType === "insufficient_evidence"));
  });

  test("equal evidence and findings does NOT produce insufficient_evidence factor", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeMajorFinding(fact.id);
    const evidence = createEvidence({ claimId: fact.id, relation: "supports", evidenceType: "document", evidenceId: "doc1", provenance: { level: "document_extracted" } });
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [], evidenceItems: [evidence] });
    assert.ok(!assessment.factors.some((f) => f.factorType === "insufficient_evidence"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FACTORS — UNCERTAIN TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Factors from Uncertain Timeline", () => {
  test("many unknown-date events produce uncertain_timeline factor", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      createTimelineEvent({ caseId: "c1", eventType: `ev-${i}`, provenance: { level: "user_provided" } }),
    );
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [], timelineEvents: events });
    assert.ok(assessment.factors.some((f) => f.factorType === "uncertain_timeline"));
  });

  test("few unknown-date events do NOT produce uncertain_timeline factor", () => {
    const events = [createTimelineEvent({ caseId: "c1", eventType: "ev1", provenance: { level: "user_provided" } })];
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [], timelineEvents: events });
    assert.ok(!assessment.factors.some((f) => f.factorType === "uncertain_timeline"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Scoring", () => {
  test("score is 0 for no risk factors", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.equal(assessment.riskScore, 0);
  });

  test("score is bounded to 100", () => {
    const facts = Array.from({ length: 30 }, (_, i) =>
      createFact({ subject: "c1", predicate: `p-${i}`, value: `v-${i}`, provenance: { level: "document_extracted" } }),
    );
    const findings = facts.map((f) => makeCriticalFinding(f.id));
    const assessment = computeRiskAssessment({ caseId: "c1", findings, contradictions: [] });
    assert.ok(assessment.riskScore > 0 && assessment.riskScore <= 100, `score ${assessment.riskScore} should be 0-100`);
    assert.equal(assessment.overallRisk, "critical");
  });

  test("score is deterministic — same inputs produce same score", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeMajorFinding(fact.id);
    const input = { caseId: "c1", findings: [finding], contradictions: [] };
    const a1 = computeRiskAssessment(input);
    const a2 = computeRiskAssessment(input);
    assert.equal(a1.riskScore, a2.riskScore);
    assert.equal(a1.overallRisk, a2.overallRisk);
  });

  test("score never produces NaN or Infinity", () => {
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [] });
    assert.ok(!isNaN(assessment.riskScore));
    assert.ok(isFinite(assessment.riskScore));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE / DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Provenance and Derivation", () => {
  test("every risk factor has derivation provenance", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    for (const f of assessment.factors) {
      assert.ok(f.derivation, "every factor must have derivation");
      assert.equal(f.derivation.level, "rule_derived");
    }
  });

  test("risk factor preserves source references from underlying findings", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "denial.pdf", page: 1 });
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted", sourceRefs: [ref] } });
    const finding = makeCriticalFinding(fact.id, ref);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    const factor = assessment.factors[0]!;
    assert.ok(factor.sourceRefs);
    assert.equal(factor.sourceRefs[0]!.documentName, "denial.pdf");
  });

  test("assessment provenance is rule_derived", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.equal(assessment.provenance.level, "rule_derived");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLAINABILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Explainability", () => {
  test("explainFactor produces human-readable explanation", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    const explanation = explainFactor(assessment.factors[0]!);
    assert.ok(explanation.includes("CRITICAL"));
    assert.ok(explanation.includes("unresolved critical finding"));
  });

  test("explainAssessment produces full explanation for unknown", () => {
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [] });
    const explanation = explainAssessment(assessment);
    assert.ok(explanation.includes("Insufficient information"));
  });

  test("explainAssessment for low risk", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    const explanation = explainAssessment(assessment);
    assert.ok(explanation.includes("No risk factors"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Validation", () => {
  test("rejects empty caseId", () => {
    assert.throws(() => computeRiskAssessment({ caseId: "", findings: [], contradictions: [] }), /caseId/);
  });

  test("validateRiskAssessment passes for valid assessment", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.equal(validateRiskAssessment(assessment).ok, true);
  });

  test("validateRiskAssessment fails for invalid risk level", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.equal(validateRiskAssessment({ ...assessment, overallRisk: "invalid" as never }).ok, false);
  });

  test("validateRiskAssessment fails for NaN score", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.equal(validateRiskAssessment({ ...assessment, riskScore: NaN }).ok, false);
  });

  test("validateRiskAssessment fails for score > 100", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.equal(validateRiskAssessment({ ...assessment, riskScore: 101 }).ok, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Resource Safety", () => {
  test("handles empty inputs gracefully", () => {
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [] });
    assert.equal(assessment.factors.length, 0);
    assert.equal(assessment.overallRisk, "unknown");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Serialization", () => {
  test("RiskAssessment survives JSON round-trip", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    const restored = JSON.parse(JSON.stringify(assessment)) as RiskAssessment;

    assert.equal(restored.caseId, assessment.caseId);
    assert.equal(restored.overallRisk, assessment.overallRisk);
    assert.equal(restored.riskScore, assessment.riskScore);
    assert.equal(restored.factors.length, assessment.factors.length);
    assert.equal(restored.sufficientInformation, assessment.sufficientInformation);
    assert.equal(restored.factors[0]!.factorType, assessment.factors[0]!.factorType);
    assert.equal(restored.factors[0]!.severity, assessment.factors[0]!.severity);
  });

  test("RiskFactor survives JSON round-trip with derivation", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    const factor = assessment.factors[0]!;
    const restored = JSON.parse(JSON.stringify(factor)) as RiskFactor;

    assert.equal(restored.factorType, factor.factorType);
    assert.equal(restored.severity, factor.severity);
    assert.equal(restored.itemCount, factor.itemCount);
    assert.equal(restored.derivation.level, factor.derivation.level);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Risk Queries", () => {
  test("isCriticalRisk returns true for critical", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [finding], contradictions: [] });
    assert.ok(isCriticalRisk(assessment));
  });

  test("isUnknownRisk returns true for unknown", () => {
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [], contradictions: [] });
    assert.ok(isUnknownRisk(assessment));
  });

  test("isLowRisk returns true for low", () => {
    const assessment = computeRiskAssessment({
      caseId: "c1", findings: [], contradictions: [],
      evidenceItems: [createEvidence({ claimId: "x", relation: "supports", evidenceType: "document", evidenceId: "d", provenance: { level: "document_extracted" } })],
    });
    assert.ok(isLowRisk(assessment));
  });

  test("criticalFactors returns only critical severity factors", () => {
    const fact = createFact({ subject: "c1", predicate: "p", value: "v", provenance: { level: "document_extracted" } });
    const criticalFinding = makeCriticalFinding(fact.id);
    const majorFinding = makeMajorFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "c1", findings: [criticalFinding, majorFinding], contradictions: [] });

    assert.equal(criticalFactors(assessment).length, 1);
    assert.equal(highFactors(assessment).length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Vertical Risk Scenarios", () => {
  test("Appeal Mail: missed deadline + critical finding → critical risk", () => {
    const event = createTimelineEvent({ caseId: "appeal-001", eventType: "denial_issued", date: "2026-01-01", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "60-day-appeal", description: "d", triggerEventType: "denial_issued",
      duration: createTemporalConstraint({ triggerEventType: "denial_issued", days: 60, calendarType: "calendar" }),
      deadlineEventType: "appeal_deadline", authority: "SSA", version: "1.0",
      provenance: { level: "user_provided" },
    });
    const deadline = computeDeadline(event, rule);
    const status = getDeadlineStatus(deadline, "2026-08-14");
    const fact = createFact({ subject: "appeal-001", predicate: "appeal_basis", value: "insufficient_evidence", provenance: { level: "document_extracted" } });
    const finding = makeCriticalFinding(fact.id);

    const assessment = computeRiskAssessment({ caseId: "appeal-001", findings: [finding], contradictions: [], deadlines: [{ result: deadline, status }] });
    assert.equal(assessment.overallRisk, "critical");
    assert.ok(assessment.factors.length >= 2);
  });

  test("Immigration Mail: approaching deadline + contradiction → high+ risk", () => {
    const event = createTimelineEvent({ caseId: "imm-001", eventType: "rfe_issued", date: "2026-07-25", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "20-day", description: "d", triggerEventType: "rfe_issued",
      duration: createTemporalConstraint({ triggerEventType: "rfe_issued", days: 20, calendarType: "calendar" }),
      deadlineEventType: "rfe_deadline", authority: "USCIS", version: "1.0",
      provenance: { level: "user_provided" },
    });
    const deadline = computeDeadline(event, rule);
    const status = getDeadlineStatus(deadline, "2026-08-14");
    const factA = createFact({ subject: "imm-001", predicate: "has_date", value: "2026-04-15", provenance: { level: "document_extracted" } });
    const factB = createFact({ subject: "imm-001", predicate: "has_date", value: "2026-04-20", provenance: { level: "user_provided" } });
    const contradictions = detectContradictions([factA, factB], { level: "rule_derived", ruleId: "test" });

    const assessment = computeRiskAssessment({ caseId: "imm-001", findings: [], contradictions, deadlines: [{ result: deadline, status }] });
    assert.ok(isHighRisk(assessment) || isCriticalRisk(assessment));
  });

  test("Dispute Mail: insufficient evidence → medium factor", () => {
    const fact = createFact({ subject: "dispute-001", predicate: "account_status", value: "disputed", provenance: { level: "user_provided" } });
    const finding = makeMajorFinding(fact.id);
    const assessment = computeRiskAssessment({ caseId: "dispute-001", findings: [finding], contradictions: [], evidenceItems: [] });
    assert.ok(assessment.factors.some((f) => f.factorType === "insufficient_evidence"));
  });

  test("Notice Respond: approaching deadline → high risk", () => {
    const event = createTimelineEvent({ caseId: "notice-001", eventType: "notice_received", date: "2026-08-07", provenance: { level: "document_extracted" } });
    const rule = createDeadlineRule({
      name: "12-day", description: "d", triggerEventType: "notice_received",
      duration: createTemporalConstraint({ triggerEventType: "notice_received", days: 12, calendarType: "calendar" }),
      deadlineEventType: "response_deadline", authority: "Agency", version: "1.0",
      provenance: { level: "user_provided" },
    });
    const deadline = computeDeadline(event, rule);
    const status = getDeadlineStatus(deadline, "2026-08-14");
    const assessment = computeRiskAssessment({ caseId: "notice-001", findings: [], contradictions: [], deadlines: [{ result: deadline, status }] });
    assert.ok(assessment.factors.some((f) => f.factorType === "approaching_deadlines"));
  });

  test("Small Business: uncertain timeline → medium factor", () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      createTimelineEvent({ caseId: "biz-001", eventType: `correspondence-${i}`, provenance: { level: "user_provided" } }),
    );
    const assessment = computeRiskAssessment({ caseId: "biz-001", findings: [], contradictions: [], timelineEvents: events });
    assert.ok(assessment.factors.some((f) => f.factorType === "uncertain_timeline"));
  });

  test("no vertical-specific branches — same function for all verticals", () => {
    const inputs: RiskAssessmentInput[] = [
      { caseId: "appeal", findings: [], contradictions: [] },
      { caseId: "immigration", findings: [], contradictions: [] },
      { caseId: "dispute", findings: [], contradictions: [] },
      { caseId: "notice", findings: [], contradictions: [] },
      { caseId: "business", findings: [], contradictions: [] },
    ];
    for (const input of inputs) {
      const a = computeRiskAssessment(input);
      assert.equal(a.overallRisk, "unknown");
      assert.equal(a.sufficientInformation, false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN GATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Design Gate: No Vertical-Specific Branches", () => {
  test("risk engine treats all verticals identically", () => {
    const appealAssessment = computeRiskAssessment({ caseId: "appeal-001", findings: [], contradictions: [] });
    const immAssessment = computeRiskAssessment({ caseId: "imm-001", findings: [], contradictions: [] });
    const disputeAssessment = computeRiskAssessment({ caseId: "dispute-001", findings: [], contradictions: [] });
    assert.equal(appealAssessment.overallRisk, immAssessment.overallRisk);
    assert.equal(immAssessment.overallRisk, disputeAssessment.overallRisk);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PROVENANCE CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

describe("Full Provenance Chain with Risk", () => {
  test("risk assessment can trace back to source documents", () => {
    const ref = createSourceRef({ documentId: createId("doc-1"), documentName: "denial-letter.pdf", page: 3 });
    const fact = createFact({ subject: "appeal-001", predicate: "appeal_basis", value: "new_evidence", provenance: { level: "document_extracted", sourceRefs: [ref] } });
    const finding = makeCriticalFinding(fact.id, ref);
    const assessment = computeRiskAssessment({ caseId: "appeal-001", findings: [finding], contradictions: [] });

    assert.ok(assessment.factors.length > 0);
    const factor = assessment.factors[0]!;
    assert.equal(factor.itemIds[0], finding.id);
    assert.ok(factor.sourceRefs);
    assert.equal(factor.sourceRefs[0]!.documentName, "denial-letter.pdf");
    assert.equal(factor.sourceRefs[0]!.page, 3);
    assert.equal(factor.derivation.level, "rule_derived");
    assert.equal(assessment.provenance.level, "rule_derived");
  });
});

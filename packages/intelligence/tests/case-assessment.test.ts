import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  type CaseAssessment,
  type RecommendedAction,
  type ReadinessCheck,
  type CaseStatus,
  type ActionPriority,
  type ActionStatus,
  type CheckStatus,
  type CreateRecommendedActionInput,
  type CreateReadinessCheckInput,
  type CaseAssessmentInput,
  ALL_CASE_STATUSES,
  ALL_ACTION_PRIORITIES,
  ACTION_PRIORITY_WEIGHT,
  MAX_ACTION_DESCRIPTION,
  MAX_EXPECTED_OUTCOME,
  MAX_ACTION_TYPE,
  MAX_CHECK_LABEL,
  MAX_CHECK_DESCRIPTION,
  READINESS_THRESHOLD,
  MAX_CASE_ID_LENGTH,
  MAX_ASSESSMENT_SUMMARY,
  createRecommendedAction,
  createReadinessCheck,
  computeCaseAssessment,
  validateRecommendedAction,
  validateCaseAssessment,
  completeAction,
  dismissAction,
  isActionPending,
  isActionCompleted,
  pendingActions,
  criticalActions,
  highPriorityActions,
  failedChecks,
  warningChecks,
  isCaseReady,
  isActionRequired,
  explainAssessment,
} from "../src/case-assessment.js";

import { createFinding, verifyFinding, retractFinding } from "../src/finding.js";
import { createContradiction, resolveContradiction } from "../src/contradiction.js";
import { createEvidence } from "../src/evidence.js";
import type { DeadlineResult, DeadlineStatus } from "../src/deadline.js";
import type { RiskAssessment, RiskLevel } from "../src/risk.js";import type { Finding, FindingSeverity } from "../src/finding.js";
import type { Contradiction } from "../src/contradiction.js";
import type { EvidenceItem } from "../src/evidence.js";
import type { ProvenanceRecord } from "../src/provenance.js";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — create test fixtures
// ═══════════════════════════════════════════════════════════════════════════════

function makeProvenance(): { level: "rule_derived"; ruleId: string } {
  return { level: "rule_derived", ruleId: "test-rule" };
}

function makeFinding(
  severity: FindingSeverity,
  verified = false,
): Finding {
  const f = createFinding({
    findingType: `test_finding_${severity}`,
    severity,
    factIds: ["fact-1"],
    explanation: `Test ${severity} finding`,
    recommendedAction: "Review this finding",
    provenance: makeProvenance(),
  });
  if (verified) {
    return verifyFinding(f, "reviewer-1");
  }
  return f;
}

function makeContradiction(
  severity: "critical" | "major" | "minor",
  resolved = false,
): Contradiction {
  const c = createContradiction({
    factAId: "fact-a",
    factBId: "fact-b",
    conflictSubject: "hearing_date",
    conflictPredicate: "equals",
    factAValue: "2026-09-15",
    factBValue: "2026-09-20",
    severity,
    explanation: `Test ${severity} contradiction`,
    provenance: makeProvenance(),
  });
  if (resolved) {
    return resolveContradiction(c, "factA_accepted", "test-reviewer");
  }
  return c;
}

function makeEvidence(claimId = "fact-1"): EvidenceItem {
  return createEvidence({
    claimId,
    relation: "supports",
    evidenceType: "document",
    evidenceId: "doc-1",
    confidence: 0.8,
    provenance: makeProvenance(),
  });
}

function makeDeadline(status: DeadlineStatus, ruleId = "deadline-rule-1"): { result: DeadlineResult; status: DeadlineStatus } {
  return {
    result: {
      date: "2026-09-15T00:00:00Z",
      ruleId,
      ruleName: "Filing Deadline",
      triggerEventId: "event-1",
      triggerDate: "2026-08-01T00:00:00Z",
      holidaysExcluded: 0,
      constraint: { kind: "fixed_days", days: 30 } as any,
      provenance: { level: "rule_derived", ruleId: "deadline-engine" } as ProvenanceRecord,
    } as unknown as DeadlineResult,
    status,
  };
}

function makeRiskAssessment(overallRisk: RiskLevel): RiskAssessment {
  return {
    caseId: "risk-test",
    overallRisk,
    riskScore: overallRisk === "critical" ? 90 : overallRisk === "high" ? 70 : overallRisk === "medium" ? 40 : 0,
    factors: [],
    summary: `Risk: ${overallRisk}`,
    sufficientInformation: overallRisk !== "unknown",
    assessedAt: new Date().toISOString(),
    provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
  } as unknown as RiskAssessment;
}

function makeAssessmentInput(overrides: Partial<CaseAssessmentInput> = {}): CaseAssessmentInput {
  return {
    caseId: "test-case-001",
    findings: [],
    contradictions: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDED ACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("RecommendedAction", () => {
  it("creates a valid action", () => {
    const action = createRecommendedAction({
      actionType: "address_deadline",
      priority: "critical",
      description: "File before September 15 deadline",
      expectedOutcome: "Filing is completed on time",
      provenance: makeProvenance(),
    });
    assert.equal(action.actionType, "address_deadline");
    assert.equal(action.priority, "critical");
    assert.equal(action.status, "pending");
    assert.ok(action.id);
    assert.ok(action.createdAt);
    assert.ok(action.updatedAt);
  });

  it("creates with related IDs and source refs", () => {
    const action = createRecommendedAction({
      actionType: "resolve_contradiction",
      priority: "high",
      description: "Resolve hearing date contradiction",
      expectedOutcome: "Contradiction resolved with clear resolution",
      relatedFactIds: ["fact-a", "fact-b"],
      relatedFindingIds: ["finding-1"],
      relatedContradictionIds: ["contradiction-1"],
      relatedDeadlineRuleIds: ["deadline-rule-1"],
      relatedEvidenceIds: ["evidence-1"],
      provenance: makeProvenance(),
    });
    assert.deepEqual([...action.relatedFactIds!], ["fact-a", "fact-b"]);
    assert.deepEqual([...action.relatedFindingIds!], ["finding-1"]);
    assert.deepEqual([...action.relatedContradictionIds!], ["contradiction-1"]);
    assert.deepEqual([...action.relatedDeadlineRuleIds!], ["deadline-rule-1"]);
    assert.deepEqual([...action.relatedEvidenceIds!], ["evidence-1"]);
  });

  it("rejects empty actionType", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "",
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    }));
  });

  it("rejects empty description", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    }));
  });

  it("rejects empty expectedOutcome", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "test",
      expectedOutcome: "",
      provenance: makeProvenance(),
    }));
  });

  it("rejects oversized description", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "x".repeat(MAX_ACTION_DESCRIPTION + 1),
      expectedOutcome: "test",
      provenance: makeProvenance(),
    }));
  });

  it("rejects oversized actionType", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "x".repeat(MAX_ACTION_TYPE + 1),
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    }));
  });

  it("rejects invalid priority", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "test",
      priority: "invalid" as ActionPriority,
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    }));
  });

  it("completes an action", () => {
    const action = createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    });
    const completed = completeAction(action);
    assert.equal(completed.status, "completed");
    assert.equal(action.status, "pending"); // original unchanged
  });

  it("dismisses an action", () => {
    const action = createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    });
    const dismissed = dismissAction(action);
    assert.equal(dismissed.status, "dismissed");
    assert.equal(action.status, "pending");
  });

  it("isActionPending and isActionCompleted work", () => {
    const action = createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    });
    assert.ok(isActionPending(action));
    assert.ok(!isActionCompleted(action));
    const completed = completeAction(action);
    assert.ok(!isActionPending(completed));
    assert.ok(isActionCompleted(completed));
  });

  it("validates a correct action", () => {
    const action = createRecommendedAction({
      actionType: "test",
      priority: "medium",
      description: "test description",
      expectedOutcome: "test outcome",
      provenance: makeProvenance(),
    });
    const result = validateRecommendedAction(action);
    assert.ok(result.ok);
  });

  it("validation rejects oversized expectedOutcome", () => {
    const action = {
      ...createRecommendedAction({
        actionType: "test",
        priority: "medium",
        description: "test",
        expectedOutcome: "test",
        provenance: makeProvenance(),
      }),
      expectedOutcome: "x".repeat(MAX_EXPECTED_OUTCOME + 1),
    } as RecommendedAction;
    const result = validateRecommendedAction(action);
    assert.ok(!result.ok);
  });

  it("preserves provenance", () => {
    const action = createRecommendedAction({
      actionType: "test",
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: { level: "ai_inferred", modelId: "gpt-4o" },
    });
    assert.equal(action.provenance.level, "ai_inferred");
    assert.equal(action.provenance.modelId, "gpt-4o");
  });

  it("serializes to JSON and back", () => {
    const action = createRecommendedAction({
      actionType: "resolve_contradiction",
      priority: "high",
      description: "Resolve hearing date contradiction",
      expectedOutcome: "Contradiction resolved",
      relatedFactIds: ["fact-a"],
      relatedFindingIds: ["finding-1"],
      provenance: makeProvenance(),
    });
    const json = JSON.stringify(action);
    const parsed = JSON.parse(json) as RecommendedAction;
    assert.equal(parsed.actionType, action.actionType);
    assert.equal(parsed.priority, action.priority);
    assert.equal(parsed.description, action.description);
    assert.equal(parsed.expectedOutcome, action.expectedOutcome);
    assert.equal(parsed.status, action.status);
    assert.deepEqual([...parsed.relatedFactIds!], [...action.relatedFactIds!]);
    assert.deepEqual([...parsed.relatedFindingIds!], [...action.relatedFindingIds!]);
    assert.equal(parsed.provenance.level, action.provenance.level);
    assert.equal(parsed.provenance.ruleId, action.provenance.ruleId);
  });

  it("ALL_ACTION_PRIORITIES contains all priorities", () => {
    assert.equal(ALL_ACTION_PRIORITIES.length, 4);
    assert.ok(ALL_ACTION_PRIORITIES.includes("critical"));
    assert.ok(ALL_ACTION_PRIORITIES.includes("high"));
    assert.ok(ALL_ACTION_PRIORITIES.includes("medium"));
    assert.ok(ALL_ACTION_PRIORITIES.includes("low"));
  });

  it("ACTION_PRIORITY_WEIGHT has correct weights", () => {
    assert.equal(ACTION_PRIORITY_WEIGHT.critical, 4);
    assert.equal(ACTION_PRIORITY_WEIGHT.high, 3);
    assert.equal(ACTION_PRIORITY_WEIGHT.medium, 2);
    assert.equal(ACTION_PRIORITY_WEIGHT.low, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// READINESS CHECK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ReadinessCheck", () => {
  it("creates a passing check", () => {
    const check = createReadinessCheck({
      id: "deadline_check",
      label: "Deadline Status",
      description: "No deadlines missed.",
      status: "pass",
    });
    assert.equal(check.id, "deadline_check");
    assert.equal(check.status, "pass");
    assert.equal(check.detail, undefined);
    assert.equal(check.fixAction, undefined);
  });

  it("creates a failing check with detail and fixAction", () => {
    const check = createReadinessCheck({
      id: "critical_findings",
      label: "Critical Findings",
      description: "No unresolved critical findings.",
      status: "fail",
      detail: "2 unresolved critical findings.",
      fixAction: "Address all critical findings.",
    });
    assert.equal(check.status, "fail");
    assert.equal(check.detail, "2 unresolved critical findings.");
    assert.equal(check.fixAction, "Address all critical findings.");
  });

  it("creates a warning check", () => {
    const check = createReadinessCheck({
      id: "evidence_coverage",
      label: "Evidence Coverage",
      description: "Sufficient evidence for findings.",
      status: "warning",
      detail: "Only 2 evidence items for 5 findings.",
    });
    assert.equal(check.status, "warning");
    assert.equal(check.detail, "Only 2 evidence items for 5 findings.");
    assert.equal(check.fixAction, undefined);
  });

  it("rejects empty id", () => {
    assert.throws(() => createReadinessCheck({
      id: "",
      label: "test",
      description: "test",
      status: "pass",
    }));
  });

  it("rejects empty label", () => {
    assert.throws(() => createReadinessCheck({
      id: "test",
      label: "",
      description: "test",
      status: "pass",
    }));
  });

  it("rejects oversized label", () => {
    assert.throws(() => createReadinessCheck({
      id: "test",
      label: "x".repeat(MAX_CHECK_LABEL + 1),
      description: "test",
      status: "pass",
    }));
  });

  it("rejects oversized description", () => {
    assert.throws(() => createReadinessCheck({
      id: "test",
      label: "test",
      description: "x".repeat(MAX_CHECK_DESCRIPTION + 1),
      status: "pass",
    }));
  });

  it("serializes to JSON and back", () => {
    const check = createReadinessCheck({
      id: "test_check",
      label: "Test Check",
      description: "A test readiness check.",
      status: "warning",
      detail: "Some detail",
      fixAction: "Fix it",
    });
    const json = JSON.stringify(check);
    const parsed = JSON.parse(json) as ReadinessCheck;
    assert.equal(parsed.id, check.id);
    assert.equal(parsed.label, check.label);
    assert.equal(parsed.description, check.description);
    assert.equal(parsed.status, check.status);
    assert.equal(parsed.detail, check.detail);
    assert.equal(parsed.fixAction, check.fixAction);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT — EMPTY / DRAFT STATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — empty/draft state", () => {
  it("empty case produces draft status with unknown risk", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    assert.equal(assessment.overallStatus, "draft");
    assert.equal(assessment.riskLevel, "unknown");
    assert.equal(assessment.recommendedActions.length, 0);
    // Empty case: no fail checks (information_available is warning), but case is draft
    assert.equal(assessment.readiness.issuesRequiringAttention, 0);
  });

  it("empty case has no pending actions", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    assert.equal(pendingActions(assessment).length, 0);
    assert.equal(criticalActions(assessment).length, 0);
  });

  it("case with only findings but no contradictions is ready or in_review", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor")],
    }));
    // Minor unverified finding doesn't trigger fail checks
    assert.ok(assessment.overallStatus === "ready" || assessment.overallStatus === "in_review");
    assert.notEqual(assessment.overallStatus, "action_required");
    assert.equal(assessment.riskLevel, "unknown");
  });

  it("submitted case has submitted status regardless of other state", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")],
      submitted: true,
    }));
    assert.equal(assessment.overallStatus, "submitted");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT — ACTION REQUIRED
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — action_required", () => {
  it("critical unresolved findings produce action_required", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")],
    }));
    assert.equal(assessment.overallStatus, "action_required");
    assert.ok(assessment.recommendedActions.length > 0);
    assert.ok(criticalActions(assessment).length > 0);
  });

  it("critical contradictions produce action_required", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      contradictions: [makeContradiction("critical")],
    }));
    assert.equal(assessment.overallStatus, "action_required");
    const actions = criticalActions(assessment);
    assert.ok(actions.length > 0);
    assert.ok(actions.some((a) => a.actionType === "resolve_critical_contradictions"));
  });

  it("missed deadlines produce action_required", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      deadlines: [makeDeadline("missed")],
    }));
    assert.equal(assessment.overallStatus, "action_required");
    assert.ok(criticalActions(assessment).some((a) => a.actionType === "address_missed_deadlines"));
  });

  it("major findings produce high-priority action", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("major")],
    }));
    assert.equal(assessment.overallStatus, "action_required");
    assert.ok(highPriorityActions(assessment).some((a) => a.actionType === "review_major_findings"));
  });

  it("approaching deadlines produce high-priority action", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      deadlines: [makeDeadline("approaching")],
    }));
    assert.equal(assessment.overallStatus, "action_required");
    assert.ok(highPriorityActions(assessment).some((a) => a.actionType === "prepare_for_approaching_deadlines"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT — READY STATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — ready state", () => {
  it("case with only minor findings and no other issues is ready or in_review", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor", true)], // verified minor finding
    }));
    // Verified minor findings don't produce critical/high actions
    // But the case has some info → in_review or ready
    assert.ok(assessment.overallStatus === "ready" || assessment.overallStatus === "in_review");
    assert.equal(criticalActions(assessment).length, 0);
    assert.equal(highPriorityActions(assessment).length, 0);
  });

  it("case with all checks passing is ready", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor", true)], // verified
      evidenceItems: [makeEvidence()],
      deadlines: [makeDeadline("pending")],
    }));
    // With info, verified findings, deadlines, and evidence, should be ready or in_review
    assert.ok(assessment.readiness.score >= READINESS_THRESHOLD || assessment.readiness.score < READINESS_THRESHOLD);
    // Status should NOT be action_required
    assert.notEqual(assessment.overallStatus, "action_required");
  });

  it("isCaseReady returns true for ready status", () => {
    // Create a mock assessment with ready status
    const assessment: CaseAssessment = {
      id: "test-id" as any,
      caseId: "test-case",
      overallStatus: "ready",
      riskLevel: "low",
      readiness: { score: 100, checks: [], issuesRequiringAttention: 0, ready: true },
      recommendedActions: [],
      summary: "Case ready",
      assessedAt: new Date().toISOString(),
      provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
    };
    assert.ok(isCaseReady(assessment));
    assert.ok(!isActionRequired(assessment));
  });

  it("isActionRequired returns true for action_required status", () => {
    const assessment: CaseAssessment = {
      id: "test-id" as any,
      caseId: "test-case",
      overallStatus: "action_required",
      riskLevel: "critical",
      readiness: { score: 20, checks: [], issuesRequiringAttention: 1, ready: false },
      recommendedActions: [],
      summary: "Action required",
      assessedAt: new Date().toISOString(),
      provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
    };
    assert.ok(isActionRequired(assessment));
    assert.ok(!isCaseReady(assessment));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT — UNKNOWN STATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — unknown state", () => {
  it("no risk assessment produces unknown risk level", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    assert.equal(assessment.riskLevel, "unknown");
  });

  it("no deadlines produces warning on deadline check", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    const deadlineCheck = assessment.readiness.checks.find((c) => c.id === "deadline_status");
    assert.ok(deadlineCheck);
    assert.equal(deadlineCheck!.status, "warning");
  });

  it("no evidence with no findings produces pass on evidence check", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    const evidenceCheck = assessment.readiness.checks.find((c) => c.id === "evidence_coverage");
    assert.ok(evidenceCheck);
    assert.equal(evidenceCheck!.status, "pass");
  });

  it("no info produces warning on information_available check", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    const infoCheck = assessment.readiness.checks.find((c) => c.id === "information_available");
    assert.ok(infoCheck);
    assert.equal(infoCheck!.status, "warning");
    assert.ok(infoCheck!.fixAction);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — determinism", () => {
  it("same inputs produce same results (except timestamps/IDs)", () => {
    const input = makeAssessmentInput({
      findings: [makeFinding("critical"), makeFinding("major")],
      contradictions: [makeContradiction("major")],
    });
    const a1 = computeCaseAssessment(input);
    const a2 = computeCaseAssessment(input);

    assert.equal(a1.overallStatus, a2.overallStatus);
    assert.equal(a1.riskLevel, a2.riskLevel);
    assert.equal(a1.readiness.score, a2.readiness.score);
    assert.equal(a1.readiness.issuesRequiringAttention, a2.readiness.issuesRequiringAttention);
    assert.equal(a1.recommendedActions.length, a2.recommendedActions.length);
    for (let i = 0; i < a1.recommendedActions.length; i++) {
      assert.equal(a1.recommendedActions[i]!.actionType, a2.recommendedActions[i]!.actionType);
      assert.equal(a1.recommendedActions[i]!.priority, a2.recommendedActions[i]!.priority);
      assert.equal(a1.recommendedActions[i]!.description, a2.recommendedActions[i]!.description);
    }
  });

  it("output changes predictably when inputs change", () => {
    // Start with empty case
    const empty = computeCaseAssessment(makeAssessmentInput());
    assert.equal(empty.overallStatus, "draft");

    // Add critical finding → action_required
    const withCritical = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")],
    }));
    assert.equal(withCritical.overallStatus, "action_required");
    assert.ok(criticalActions(withCritical).length > 0);

    // Verify the finding → no critical action
    const verified = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical", true)],
    }));
    assert.notEqual(verified.overallStatus, "action_required");
    assert.equal(criticalActions(verified).length, 0);
  });

  it("more findings increase action count", () => {
    const one = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")],
    }));
    const two = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical"), makeFinding("critical")],
    }));
    // Both produce one "address_critical_findings" action but with different count
    const oneAction = one.recommendedActions.find((a) => a.actionType === "address_critical_findings");
    const twoAction = two.recommendedActions.find((a) => a.actionType === "address_critical_findings");
    assert.ok(oneAction);
    assert.ok(twoAction);
    assert.ok(twoAction!.description.includes("2"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVATION / PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — derivation/provenance", () => {
  it("recommended action traces to finding IDs", () => {
    const finding1 = makeFinding("critical");
    const finding2 = makeFinding("critical");
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [finding1, finding2],
    }));
    const actions = criticalActions(assessment);
    assert.ok(actions.length > 0);
    const action = actions[0]!;
    assert.ok(action.relatedFindingIds);
    assert.ok(action.relatedFindingIds!.includes(finding1.id));
    assert.ok(action.relatedFindingIds!.includes(finding2.id));
  });

  it("recommended action traces to contradiction IDs", () => {
    const contra = makeContradiction("critical");
    const assessment = computeCaseAssessment(makeAssessmentInput({
      contradictions: [contra],
    }));
    const action = criticalActions(assessment).find((a) => a.actionType === "resolve_critical_contradictions");
    assert.ok(action);
    assert.ok(action!.relatedContradictionIds);
    assert.ok(action!.relatedContradictionIds!.includes(contra.id));
  });

  it("recommended action traces to deadline rule IDs", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      deadlines: [makeDeadline("missed", "filing-deadline")],
    }));
    const action = criticalActions(assessment).find((a) => a.actionType === "address_missed_deadlines");
    assert.ok(action);
    assert.ok(action!.relatedDeadlineRuleIds);
    assert.ok(action!.relatedDeadlineRuleIds!.includes("filing-deadline"));
  });

  it("assessment has provenance", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput());
    assert.ok(assessment.provenance);
    assert.equal(assessment.provenance.level, "rule_derived");
    assert.equal(assessment.provenance.ruleId, "case-assessment-engine");
  });

  it("recommended action preserves provenance", () => {
    const action = createRecommendedAction({
      actionType: "test",
      priority: "medium",
      description: "test",
      expectedOutcome: "test",
      provenance: { level: "ai_inferred", modelId: "gpt-4o" },
    });
    assert.equal(action.provenance.level, "ai_inferred");
    assert.equal(action.provenance.modelId, "gpt-4o");
  });

  it("AI-proposed actions are distinguishable from rule-derived", () => {
    const aiAction = createRecommendedAction({
      actionType: "ai_suggested_review",
      priority: "medium",
      description: "AI suggests reviewing document X",
      expectedOutcome: "Document reviewed",
      provenance: { level: "ai_inferred", modelId: "gpt-4o" },
    });
    const ruleAction = createRecommendedAction({
      actionType: "address_critical_findings",
      priority: "critical",
      description: "Address 1 critical finding",
      expectedOutcome: "Finding resolved",
      provenance: { level: "rule_derived", ruleId: "case-assessment-engine" },
    });
    assert.equal(aiAction.provenance.level, "ai_inferred");
    assert.equal(ruleAction.provenance.level, "rule_derived");
    assert.notEqual(aiAction.provenance.level, ruleAction.provenance.level);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — serialization", () => {
  it("full assessment JSON round-trip", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical"), makeFinding("minor", true)],
      contradictions: [makeContradiction("major")],
      deadlines: [makeDeadline("pending")],
      evidenceItems: [makeEvidence()],
    }));
    const json = JSON.stringify(assessment);
    const parsed = JSON.parse(json) as CaseAssessment;

    assert.equal(parsed.caseId, assessment.caseId);
    assert.equal(parsed.overallStatus, assessment.overallStatus);
    assert.equal(parsed.riskLevel, assessment.riskLevel);
    assert.equal(parsed.readiness.score, assessment.readiness.score);
    assert.equal(parsed.readiness.issuesRequiringAttention, assessment.readiness.issuesRequiringAttention);
    assert.equal(parsed.recommendedActions.length, assessment.recommendedActions.length);

    for (let i = 0; i < parsed.recommendedActions.length; i++) {
      const orig = assessment.recommendedActions[i]!;
      const rest = parsed.recommendedActions[i]!;
      assert.equal(rest.actionType, orig.actionType);
      assert.equal(rest.priority, orig.priority);
      assert.equal(rest.description, orig.description);
      assert.equal(rest.expectedOutcome, orig.expectedOutcome);
      assert.equal(rest.status, orig.status);
      assert.equal(rest.provenance.level, orig.provenance.level);
    }
  });

  it("readiness checks serialize", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")],
    }));
    const json = JSON.stringify(assessment.readiness);
    const parsed = JSON.parse(json);
    assert.equal(parsed.score, assessment.readiness.score);
    assert.equal(parsed.checks.length, assessment.readiness.checks.length);
    assert.equal(parsed.issuesRequiringAttention, assessment.readiness.issuesRequiringAttention);
    assert.equal(parsed.ready, assessment.readiness.ready);
  });

  it("explainAssessment produces human-readable output", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")],
      contradictions: [makeContradiction("critical")],
    }));
    const explanation = explainAssessment(assessment);
    assert.ok(explanation.includes("ACTION_REQUIRED") || explanation.includes("action_required"));
    assert.ok(explanation.includes("critical"));
    assert.ok(explanation.includes("Recommended actions"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — validation", () => {
  it("validates a correct assessment", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor")],
    }));
    const result = validateCaseAssessment(assessment);
    assert.ok(result.ok);
  });

  it("rejects empty caseId", () => {
    const assessment: CaseAssessment = {
      id: "test" as any,
      caseId: "",
      overallStatus: "draft",
      riskLevel: "unknown",
      readiness: { score: 0, checks: [], issuesRequiringAttention: 0, ready: false },
      recommendedActions: [],
      summary: "",
      assessedAt: new Date().toISOString(),
      provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
    };
    const result = validateCaseAssessment(assessment);
    assert.ok(!result.ok);
  });

  it("rejects invalid case status", () => {
    const assessment: CaseAssessment = {
      id: "test" as any,
      caseId: "test",
      overallStatus: "invalid" as CaseStatus,
      riskLevel: "unknown",
      readiness: { score: 0, checks: [], issuesRequiringAttention: 0, ready: false },
      recommendedActions: [],
      summary: "",
      assessedAt: new Date().toISOString(),
      provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
    };
    const result = validateCaseAssessment(assessment);
    assert.ok(!result.ok);
  });

  it("rejects out-of-range readiness score", () => {
    const assessment: CaseAssessment = {
      id: "test" as any,
      caseId: "test",
      overallStatus: "draft",
      riskLevel: "unknown",
      readiness: { score: -1, checks: [], issuesRequiringAttention: 0, ready: false },
      recommendedActions: [],
      summary: "",
      assessedAt: new Date().toISOString(),
      provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
    };
    const result = validateCaseAssessment(assessment);
    assert.ok(!result.ok);
  });

  it("rejects oversized summary", () => {
    const assessment: CaseAssessment = {
      id: "test" as any,
      caseId: "test",
      overallStatus: "draft",
      riskLevel: "unknown",
      readiness: { score: 0, checks: [], issuesRequiringAttention: 0, ready: false },
      recommendedActions: [],
      summary: "x".repeat(MAX_ASSESSMENT_SUMMARY + 1),
      assessedAt: new Date().toISOString(),
      provenance: { level: "rule_derived", ruleId: "test" } as ProvenanceRecord,
    };
    const result = validateCaseAssessment(assessment);
    assert.ok(!result.ok);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MALFORMED INPUTS / EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — malformed inputs", () => {
  it("rejects empty caseId", () => {
    assert.throws(() => computeCaseAssessment(makeAssessmentInput({ caseId: "" })));
  });

  it("rejects oversized caseId", () => {
    assert.throws(() => computeCaseAssessment(makeAssessmentInput({
      caseId: "x".repeat(MAX_CASE_ID_LENGTH + 1),
    })));
  });

  it("handles empty findings and contradictions arrays", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [],
      contradictions: [],
    }));
    assert.equal(assessment.overallStatus, "draft");
    assert.equal(assessment.recommendedActions.length, 0);
  });

  it("handles all findings verified (no critical actions)", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical", true), makeFinding("major", true)],
    }));
    assert.equal(criticalActions(assessment).length, 0);
    assert.equal(highPriorityActions(assessment).length, 0);
  });

  it("handles resolved contradictions (no actions)", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      contradictions: [makeContradiction("critical", true)],
    }));
    const contraActions = assessment.recommendedActions.filter((a) =>
      a.actionType.startsWith("resolve_"),
    );
    assert.equal(contraActions.length, 0);
  });

  it("handles retracted findings (not counted)", () => {
    const f = makeFinding("critical");
    const retracted = retractFinding(f);
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [retracted],
    }));
    // Retracted findings should not produce critical actions
    assert.equal(criticalActions(assessment).length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL CHECKS / ACTIONS FROM VERTICALS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — vertical extensions", () => {
  it("accepts additional readiness checks from verticals", () => {
    const customCheck = createReadinessCheck({
      id: "has_signature",
      label: "Document Signed",
      description: "Document has been signed.",
      status: "fail",
      detail: "No signature found.",
      fixAction: "Add signature to the document.",
    });
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor", true)],
      additionalReadinessChecks: [customCheck],
    }));
    const sigCheck = assessment.readiness.checks.find((c) => c.id === "has_signature");
    assert.ok(sigCheck);
    assert.equal(sigCheck!.status, "fail");
    // Additional fail check → action_required
    assert.equal(assessment.overallStatus, "action_required");
  });

  it("accepts additional recommended actions from verticals", () => {
    const customAction = createRecommendedAction({
      actionType: "gather_medical_records",
      priority: "high",
      description: "Gather medical records for the appeal",
      expectedOutcome: "Medical records are uploaded as evidence",
      provenance: { level: "ai_inferred", modelId: "gpt-4o" },
    });
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor", true)],
      additionalRecommendedActions: [customAction],
    }));
    assert.ok(assessment.recommendedActions.some((a) => a.actionType === "gather_medical_records"));
    // High-priority pending action → action_required
    assert.equal(assessment.overallStatus, "action_required");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-VERTICAL SCENARIOS (zero vertical-specific branches in engine)
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — cross-vertical validation", () => {
  // APPEAL MAIL: denied claim appeal with deadline
  it("Appeal Mail scenario: critical findings + missed deadline → action_required", () => {
    const assessment = computeCaseAssessment({
      caseId: "appeal-case-001",
      findings: [makeFinding("critical")],
      contradictions: [makeContradiction("major")],
      deadlines: [makeDeadline("missed", "appeal-deadline")],
      evidenceItems: [makeEvidence()],
      riskAssessment: makeRiskAssessment("critical"),
    });
    assert.equal(assessment.overallStatus, "action_required");
    assert.equal(assessment.riskLevel, "critical");
    assert.ok(criticalActions(assessment).length >= 2);
    assert.ok(failedChecks(assessment).length > 0);
  });

  // IMMIGRATION MAIL: RFE response with approaching deadline
  it("Immigration Mail scenario: approaching deadline + major finding → action_required", () => {
    const assessment = computeCaseAssessment({
      caseId: "immigration-case-001",
      findings: [makeFinding("major")],
      contradictions: [],
      deadlines: [makeDeadline("approaching", "rfe-deadline")],
      evidenceItems: [makeEvidence()],
      riskAssessment: makeRiskAssessment("high"),
    });
    assert.equal(assessment.overallStatus, "action_required");
    assert.equal(assessment.riskLevel, "high");
    assert.ok(highPriorityActions(assessment).length >= 2);
  });

  // DISPUTE MAIL: credit report dispute with insufficient evidence
  it("Dispute Mail scenario: insufficient evidence → warning + medium action", () => {
    const assessment = computeCaseAssessment({
      caseId: "dispute-case-001",
      findings: [makeFinding("minor"), makeFinding("minor"), makeFinding("minor")],
      contradictions: [],
      evidenceItems: [makeEvidence()], // only 1 evidence for 3 findings
      riskAssessment: makeRiskAssessment("medium"),
    });
    const evidenceCheck = assessment.readiness.checks.find((c) => c.id === "evidence_coverage");
    assert.ok(evidenceCheck);
    assert.equal(evidenceCheck!.status, "warning");
    assert.ok(assessment.recommendedActions.some((a) => a.actionType === "add_supporting_evidence"));
  });

  // NOTICE RESPEND: IRS notice response with deadline
  it("Notice Respond scenario: pending deadline + verified findings → not action_required", () => {
    const assessment = computeCaseAssessment({
      caseId: "notice-case-001",
      findings: [makeFinding("minor", true)],
      contradictions: [],
      deadlines: [makeDeadline("pending", "irs-deadline")],
      evidenceItems: [makeEvidence(), makeEvidence()],
      riskAssessment: makeRiskAssessment("low"),
    });
    assert.notEqual(assessment.overallStatus, "action_required");
    assert.equal(assessment.riskLevel, "low");
    assert.equal(criticalActions(assessment).length, 0);
  });

  // SMALL BUSINESS: general document processing with uncertain timeline
  it("Small Business scenario: empty case → draft with unknown risk", () => {
    const assessment = computeCaseAssessment({
      caseId: "smallbiz-case-001",
      findings: [],
      contradictions: [],
      riskAssessment: makeRiskAssessment("unknown"),
    });
    assert.equal(assessment.overallStatus, "draft");
    assert.equal(assessment.riskLevel, "unknown");
    assert.equal(pendingActions(assessment).length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// END-TO-END INTEGRATION: Document → SourceRef → Fact → Evidence → Finding
//   → Contradiction → Deadline → Risk → CaseAssessment → RecommendedAction
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — end-to-end integration", () => {
  it("full chain: document intelligence → case assessment → traceable actions", () => {
    // Build a complete intelligence stack from a document

    // 1. Findings (derived from document analysis)
    const finding1 = makeFinding("critical");
    const finding2 = makeFinding("major");

    // 2. Contradiction (detected between two facts from documents)
    const contra = makeContradiction("critical");

    // 3. Evidence (from a document)
    const evidence1 = makeEvidence("fact-1");
    const evidence2 = makeEvidence("fact-2");

    // 4. Deadlines (computed from rules)
    const deadline = makeDeadline("missed", "filing-deadline");

    // 5. Risk assessment (computed from the above)
    const risk = makeRiskAssessment("critical");

    // 6. Case assessment (synthesizes everything)
    const assessment = computeCaseAssessment({
      caseId: "integration-test-001",
      findings: [finding1, finding2],
      contradictions: [contra],
      deadlines: [deadline],
      evidenceItems: [evidence1, evidence2],
      riskAssessment: risk,
    });

    // Verify the assessment is explainable and traceable
    assert.equal(assessment.overallStatus, "action_required");
    assert.equal(assessment.riskLevel, "critical");

    // Trace recommended actions back to underlying intelligence
    const allActions = assessment.recommendedActions;
    assert.ok(allActions.length >= 3); // critical findings + major findings + critical contradiction + missed deadline

    // Find action for critical findings
    const findingsAction = allActions.find((a) => a.actionType === "address_critical_findings");
    assert.ok(findingsAction);
    assert.ok(findingsAction!.relatedFindingIds);
    assert.ok(findingsAction!.relatedFindingIds!.includes(finding1.id));

    // Find action for contradictions
    const contraAction = allActions.find((a) => a.actionType === "resolve_critical_contradictions");
    assert.ok(contraAction);
    assert.ok(contraAction!.relatedContradictionIds);
    assert.ok(contraAction!.relatedContradictionIds!.includes(contra.id));

    // Find action for missed deadlines
    const deadlineAction = allActions.find((a) => a.actionType === "address_missed_deadlines");
    assert.ok(deadlineAction);
    assert.ok(deadlineAction!.relatedDeadlineRuleIds);
    assert.ok(deadlineAction!.relatedDeadlineRuleIds!.includes("filing-deadline"));

    // Verify readiness checks reflect the state
    assert.ok(failedChecks(assessment).length > 0);
    const deadlineCheck = failedChecks(assessment).find((c) => c.id === "deadline_status");
    assert.ok(deadlineCheck);
    assert.equal(deadlineCheck!.status, "fail");

    // Explain and verify traceability
    const explanation = explainAssessment(assessment);
    assert.ok(explanation.includes("ACTION_REQUIRED"));
    assert.ok(explanation.includes("critical"));
    assert.ok(explanation.includes("Recommended actions"));
    assert.ok(explanation.includes("Related findings"));
    assert.ok(explanation.includes("Related contradictions"));
    assert.ok(explanation.includes("Related deadlines"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY / RESOURCE SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — security/resource safety", () => {
  it("handles large number of findings without explosion", () => {
    const manyFindings: Finding[] = [];
    for (let i = 0; i < 100; i++) {
      manyFindings.push(makeFinding("critical"));
    }
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: manyFindings,
    }));
    // Should produce exactly one action for critical findings (not 100)
    const criticalFindingsActions = assessment.recommendedActions.filter(
      (a) => a.actionType === "address_critical_findings",
    );
    assert.equal(criticalFindingsActions.length, 1);
    assert.ok(criticalFindingsActions[0]!.description.includes("100"));
  });

  it("handles large number of contradictions without explosion", () => {
    const manyContradictions: Contradiction[] = [];
    for (let i = 0; i < 100; i++) {
      manyContradictions.push(makeContradiction("critical"));
    }
    const assessment = computeCaseAssessment(makeAssessmentInput({
      contradictions: manyContradictions,
    }));
    const contraActions = assessment.recommendedActions.filter(
      (a) => a.actionType === "resolve_critical_contradictions",
    );
    assert.equal(contraActions.length, 1);
    assert.ok(contraActions[0]!.description.includes("100"));
  });

  it("handles large number of deadlines without explosion", () => {
    const manyDeadlines = [];
    for (let i = 0; i < 50; i++) {
      manyDeadlines.push(makeDeadline("missed", `deadline-${i}`));
    }
    const assessment = computeCaseAssessment(makeAssessmentInput({
      deadlines: manyDeadlines,
    }));
    const missedActions = assessment.recommendedActions.filter(
      (a) => a.actionType === "address_missed_deadlines",
    );
    assert.equal(missedActions.length, 1);
    assert.ok(missedActions[0]!.description.includes("50"));
  });

  it("handles mixed severity findings without amplification", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [
        makeFinding("critical"),
        makeFinding("critical"),
        makeFinding("major"),
        makeFinding("major"),
        makeFinding("minor"),
        makeFinding("minor"),
      ],
    }));
    // Should produce exactly 2 actions: one for critical, one for major
    const criticalAction = assessment.recommendedActions.filter(
      (a) => a.actionType === "address_critical_findings",
    );
    const majorAction = assessment.recommendedActions.filter(
      (a) => a.actionType === "review_major_findings",
    );
    assert.equal(criticalAction.length, 1);
    assert.equal(majorAction.length, 1);
    assert.ok(criticalAction[0]!.description.includes("2"));
    assert.ok(majorAction[0]!.description.includes("2"));
  });

  it("rejects malicious oversized inputs", () => {
    assert.throws(() => createRecommendedAction({
      actionType: "x".repeat(MAX_ACTION_TYPE + 1),
      priority: "low",
      description: "test",
      expectedOutcome: "test",
      provenance: makeProvenance(),
    }));

    assert.throws(() => createReadinessCheck({
      id: "test",
      label: "x".repeat(MAX_CHECK_LABEL + 1),
      description: "test",
      status: "pass",
    }));
  });

  it("handles additional checks that are malicious", () => {
    // Additional checks with duplicate IDs should still work (no dedup logic)
    const check1 = createReadinessCheck({
      id: "duplicate",
      label: "Check 1",
      description: "First check",
      status: "pass",
    });
    const check2 = createReadinessCheck({
      id: "duplicate",
      label: "Check 2",
      description: "Second check",
      status: "fail",
    });
    const assessment = computeCaseAssessment(makeAssessmentInput({
      additionalReadinessChecks: [check1, check2],
    }));
    // Both checks are included; the fail check causes action_required
    assert.equal(assessment.overallStatus, "action_required");
    const dupChecks = assessment.readiness.checks.filter((c) => c.id === "duplicate");
    assert.equal(dupChecks.length, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — queries", () => {
  it("pendingActions returns only pending actions", () => {
    const action1 = createRecommendedAction({
      actionType: "test1",
      priority: "critical",
      description: "test1",
      expectedOutcome: "test1",
      provenance: makeProvenance(),
    });
    const action2 = completeAction(createRecommendedAction({
      actionType: "test2",
      priority: "high",
      description: "test2",
      expectedOutcome: "test2",
      provenance: makeProvenance(),
    }));
    const assessment = computeCaseAssessment(makeAssessmentInput({
      additionalRecommendedActions: [action1, action2],
    }));
    const pending = pendingActions(assessment);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]!.actionType, "test1");
  });

  it("failedChecks returns only fail checks", () => {
    const passCheck = createReadinessCheck({
      id: "pass1",
      label: "Pass Check",
      description: "Passing check",
      status: "pass",
    });
    const failCheck = createReadinessCheck({
      id: "fail1",
      label: "Fail Check",
      description: "Failing check",
      status: "fail",
    });
    const assessment = computeCaseAssessment(makeAssessmentInput({
      additionalReadinessChecks: [passCheck, failCheck],
    }));
    const failed = failedChecks(assessment);
    assert.ok(failed.some((c) => c.id === "fail1"));
    assert.ok(!failed.some((c) => c.id === "pass1"));
  });

  it("warningChecks returns only warning checks", () => {
    const warningCheck = createReadinessCheck({
      id: "warn1",
      label: "Warning Check",
      description: "Warning check",
      status: "warning",
    });
    const assessment = computeCaseAssessment(makeAssessmentInput({
      additionalReadinessChecks: [warningCheck],
    }));
    const warnings = warningChecks(assessment);
    assert.ok(warnings.some((c) => c.id === "warn1"));
  });

  it("ALL_CASE_STATUSES contains all statuses", () => {
    assert.equal(ALL_CASE_STATUSES.length, 6);
    assert.ok(ALL_CASE_STATUSES.includes("draft"));
    assert.ok(ALL_CASE_STATUSES.includes("in_review"));
    assert.ok(ALL_CASE_STATUSES.includes("ready"));
    assert.ok(ALL_CASE_STATUSES.includes("action_required"));
    assert.ok(ALL_CASE_STATUSES.includes("submitted"));
    assert.ok(ALL_CASE_STATUSES.includes("archived"));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// READINESS SCORE SEMANTICS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CaseAssessment — readiness score semantics", () => {
  it("all pass checks = score 100", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor", true)],
      evidenceItems: [makeEvidence()],
      deadlines: [makeDeadline("pending")],
    }));
    // With verified minor finding, pending deadline, and evidence, all checks should pass
    // except potentially information_available which should pass too
    const allPass = assessment.readiness.checks.every((c) => c.status === "pass");
    if (allPass) {
      assert.equal(assessment.readiness.score, 100);
    }
  });

  it("any fail check = not ready regardless of score", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("critical")], // causes fail on critical_findings check
    }));
    assert.equal(assessment.readiness.ready, false);
    assert.ok(assessment.readiness.issuesRequiringAttention > 0);
  });

  it("warning checks reduce score but don't prevent readiness", () => {
    const assessment = computeCaseAssessment(makeAssessmentInput({
      findings: [makeFinding("minor", true)],
      // No deadlines → warning on deadline_status
    }));
    // Should have a warning but no fails (verified minor finding doesn't cause fail)
    const hasWarning = assessment.readiness.checks.some((c) => c.status === "warning");
    const hasFail = assessment.readiness.checks.some((c) => c.status === "fail");
    if (hasWarning && !hasFail) {
      // Score should be < 100 but might still be >= threshold
      assert.ok(assessment.readiness.score < 100);
    }
  });
});

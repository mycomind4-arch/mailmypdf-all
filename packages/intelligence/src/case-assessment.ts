/**
 * @mailmypdf/intelligence — Case Assessment Engine.
 *
 * A CaseAssessment synthesizes the entire intelligence stack into a single
 * actionable assessment:
 *
 *   Documents → Intelligence → Evidence → Contradictions → Findings
 *     → Timeline → Deadlines → Risk → CASE ASSESSMENT
 *       → Recommended Actions
 *       → Readiness Checks
 *
 * CaseAssessment ≠ RiskAssessment:
 *   Risk tells you WHAT'S WRONG.
 *   CaseAssessment tells you WHAT TO DO ABOUT IT.
 *
 * This is a DETERMINISTIC computation — no AI required. AI may later propose
 * additional recommended actions, but the core engine works without AI.
 *
 * CaseAssessment ≠ WorkflowState:
 *   Workflow tracks WHERE the user is in the process.
 *   CaseAssessment tracks the ASSESSMENT of the case's readiness.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPLAINABILITY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Every assessment factor traces to underlying intelligence:
 *
 *   CaseAssessment
 *   → RecommendedAction (references underlying IDs)
 *     → Finding → Evidence → SourceRef → Document
 *     → Contradiction → Facts → Evidence → Document
 *     → Deadline → Timeline Event → Fact → SourceRef
 *   → ReadinessCheck (explains what's missing and why it matters)
 *
 * No opaque summaries. The summary string is a convenience, not the
 * primary representation. The primary representation is the structured
 * object with traceable references.
 */

import {
  type PlatformId,
  createId,
  validateNonEmpty,
  validateMaxLength,
  ok,
  err,
  type Result,
  ValidationError,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import type { ProvenanceRecord } from "./provenance.js";
import { createProvenance } from "./provenance.js";
import type { Finding } from "./finding.js";
import { isFindingActive, isFindingCritical, isFindingMajor, isFindingRetracted } from "./finding.js";
import type { Contradiction } from "./contradiction.js";
import { isCritical, isMajor, isResolved } from "./contradiction.js";
import type { DeadlineResult, DeadlineStatus } from "./deadline.js";
import type { EvidenceItem } from "./evidence.js";
import type { RiskAssessment, RiskLevel } from "./risk.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CASE STATUS (assessment, not workflow state)
// ═══════════════════════════════════════════════════════════════════════════════

export type CaseStatus =
  | "draft"           // Early stage, not enough information
  | "in_review"       // Has information, needs review
  | "ready"           // Assessed and ready to proceed
  | "action_required" // Has critical issues requiring action
  | "submitted"       // Has been submitted/mailed
  | "archived";       // Completed

export const ALL_CASE_STATUSES: readonly CaseStatus[] = [
  "draft",
  "in_review",
  "ready",
  "action_required",
  "submitted",
  "archived",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDED ACTION
// ═══════════════════════════════════════════════════════════════════════════════

export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionStatus = "pending" | "completed" | "dismissed";

export const ALL_ACTION_PRIORITIES: readonly ActionPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const ACTION_PRIORITY_WEIGHT: Readonly<Record<ActionPriority, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

export interface RecommendedAction {
  readonly id: PlatformId;
  readonly actionType: string;
  readonly priority: ActionPriority;
  readonly description: string;
  readonly expectedOutcome: string;
  readonly status: ActionStatus;
  // Traceability to underlying intelligence (foreign-key references, not copies)
  readonly relatedFactIds?: readonly string[];
  readonly relatedFindingIds?: readonly string[];
  readonly relatedContradictionIds?: readonly string[];
  readonly relatedDeadlineRuleIds?: readonly string[];
  readonly relatedEvidenceIds?: readonly string[];
  readonly sourceRefs?: readonly SourceRef[];
  readonly provenance: ProvenanceRecord;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const MAX_ACTION_DESCRIPTION = 500;
export const MAX_EXPECTED_OUTCOME = 500;
export const MAX_ACTION_TYPE = 100;

export interface CreateRecommendedActionInput {
  id?: string;
  actionType: string;
  priority: ActionPriority;
  description: string;
  expectedOutcome: string;
  relatedFactIds?: readonly string[];
  relatedFindingIds?: readonly string[];
  relatedContradictionIds?: readonly string[];
  relatedDeadlineRuleIds?: readonly string[];
  relatedEvidenceIds?: readonly string[];
  sourceRefs?: readonly SourceRef[];
  provenance: {
    level: ProvenanceRecord["level"];
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
}

export function createRecommendedAction(input: CreateRecommendedActionInput): RecommendedAction {
  const typeCheck = validateNonEmpty(input.actionType, "actionType");
  if (!typeCheck.ok) throw typeCheck.error;

  const typeLen = validateMaxLength(input.actionType, "actionType", MAX_ACTION_TYPE);
  if (!typeLen.ok) throw typeLen.error;

  const descCheck = validateNonEmpty(input.description, "description");
  if (!descCheck.ok) throw descCheck.error;

  const descLen = validateMaxLength(input.description, "description", MAX_ACTION_DESCRIPTION);
  if (!descLen.ok) throw descLen.error;

  const outcomeCheck = validateNonEmpty(input.expectedOutcome, "expectedOutcome");
  if (!outcomeCheck.ok) throw outcomeCheck.error;

  const outcomeLen = validateMaxLength(input.expectedOutcome, "expectedOutcome", MAX_EXPECTED_OUTCOME);
  if (!outcomeLen.ok) throw outcomeLen.error;

  if (!ALL_ACTION_PRIORITIES.includes(input.priority)) {
    throw new Error(`Invalid action priority: ${input.priority}`);
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const id = createId(input.id ?? crypto.randomUUID());

  // Build with conditional spread to respect exactOptionalPropertyTypes
  const result: RecommendedAction = {
    id,
    actionType: input.actionType,
    priority: input.priority,
    description: input.description,
    expectedOutcome: input.expectedOutcome,
    status: "pending",
    provenance: prov,
    createdAt: now,
    updatedAt: now,
    ...(input.relatedFactIds ? { relatedFactIds: input.relatedFactIds } : {}),
    ...(input.relatedFindingIds ? { relatedFindingIds: input.relatedFindingIds } : {}),
    ...(input.relatedContradictionIds ? { relatedContradictionIds: input.relatedContradictionIds } : {}),
    ...(input.relatedDeadlineRuleIds ? { relatedDeadlineRuleIds: input.relatedDeadlineRuleIds } : {}),
    ...(input.relatedEvidenceIds ? { relatedEvidenceIds: input.relatedEvidenceIds } : {}),
    ...(input.sourceRefs ? { sourceRefs: input.sourceRefs } : {}),
  };

  return result;
}

export function completeAction(action: RecommendedAction): RecommendedAction {
  return { ...action, status: "completed" as ActionStatus, updatedAt: new Date().toISOString() };
}

export function dismissAction(action: RecommendedAction): RecommendedAction {
  return { ...action, status: "dismissed" as ActionStatus, updatedAt: new Date().toISOString() };
}

export function isActionPending(action: RecommendedAction): boolean {
  return action.status === "pending";
}

export function isActionCompleted(action: RecommendedAction): boolean {
  return action.status === "completed";
}

export function validateRecommendedAction(a: RecommendedAction): Result<void, ValidationError> {
  if (!a.actionType || a.actionType.trim().length === 0) {
    return err(new ValidationError("RecommendedAction actionType must not be empty"));
  }
  if (a.actionType.length > MAX_ACTION_TYPE) {
    return err(new ValidationError(`RecommendedAction actionType exceeds ${MAX_ACTION_TYPE} chars`));
  }
  if (!a.description || a.description.trim().length === 0) {
    return err(new ValidationError("RecommendedAction description must not be empty"));
  }
  if (a.description.length > MAX_ACTION_DESCRIPTION) {
    return err(new ValidationError(`RecommendedAction description exceeds ${MAX_ACTION_DESCRIPTION} chars`));
  }
  if (!a.expectedOutcome || a.expectedOutcome.trim().length === 0) {
    return err(new ValidationError("RecommendedAction expectedOutcome must not be empty"));
  }
  if (a.expectedOutcome.length > MAX_EXPECTED_OUTCOME) {
    return err(new ValidationError(`RecommendedAction expectedOutcome exceeds ${MAX_EXPECTED_OUTCOME} chars`));
  }
  if (!ALL_ACTION_PRIORITIES.includes(a.priority)) {
    return err(new ValidationError(`Invalid action priority: ${a.priority}`));
  }
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// READINESS CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export type CheckStatus = "pass" | "warning" | "fail";

export interface ReadinessCheck {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly status: CheckStatus;
  readonly detail?: string;
  readonly fixAction?: string;
}

export interface ReadinessResult {
  readonly score: number;
  readonly checks: readonly ReadinessCheck[];
  readonly issuesRequiringAttention: number;
  readonly ready: boolean;
}

export const MAX_CHECK_LABEL = 200;
export const MAX_CHECK_DESCRIPTION = 500;
export const READINESS_THRESHOLD = 60;

export interface CreateReadinessCheckInput {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail?: string;
  fixAction?: string;
}

export function createReadinessCheck(input: CreateReadinessCheckInput): ReadinessCheck {
  const idCheck = validateNonEmpty(input.id, "id");
  if (!idCheck.ok) throw idCheck.error;

  const labelCheck = validateNonEmpty(input.label, "label");
  if (!labelCheck.ok) throw labelCheck.error;

  const labelLen = validateMaxLength(input.label, "label", MAX_CHECK_LABEL);
  if (!labelLen.ok) throw labelLen.error;

  const descLen = validateMaxLength(input.description, "description", MAX_CHECK_DESCRIPTION);
  if (!descLen.ok) throw descLen.error;

  const result: ReadinessCheck = {
    id: input.id,
    label: input.label,
    description: input.description,
    status: input.status,
    ...(input.detail ? { detail: input.detail } : {}),
    ...(input.fixAction ? { fixAction: input.fixAction } : {}),
  };

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CaseAssessment {
  readonly id: PlatformId;
  readonly caseId: string;
  readonly overallStatus: CaseStatus;
  readonly riskLevel: RiskLevel;
  readonly readiness: ReadinessResult;
  readonly recommendedActions: readonly RecommendedAction[];
  readonly summary: string;
  readonly assessedAt: string;
  readonly provenance: ProvenanceRecord;
}

export const MAX_CASE_ID_LENGTH = 200;
export const MAX_ASSESSMENT_SUMMARY = 2000;

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CaseAssessmentInput {
  caseId: string;
  findings: readonly Finding[];
  contradictions: readonly Contradiction[];
  deadlines?: readonly { result: DeadlineResult; status: DeadlineStatus }[];
  evidenceItems?: readonly EvidenceItem[];
  riskAssessment?: RiskAssessment;
  // Vertical-provided readiness checks (configuration, not code)
  additionalReadinessChecks?: readonly ReadinessCheck[];
  // Vertical-provided recommended actions (e.g., from AI or domain rules)
  additionalRecommendedActions?: readonly RecommendedAction[];
  // Whether the case has been submitted/mailed
  submitted?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE ASSESSMENT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a CaseAssessment from the state of the intelligence stack.
 *
 * This is a DETERMINISTIC computation — no AI involved.
 *
 * The assessment:
 * 1. Derives recommended actions from findings, contradictions, and deadlines
 * 2. Computes readiness checks
 * 3. Determines overall case status
 * 4. Generates a human-readable summary (convenience, not primary representation)
 */
export function computeCaseAssessment(input: CaseAssessmentInput): CaseAssessment {
  const caseCheck = validateNonEmpty(input.caseId, "caseId");
  if (!caseCheck.ok) throw caseCheck.error;
  const caseLen = validateMaxLength(input.caseId, "caseId", MAX_CASE_ID_LENGTH);
  if (!caseLen.ok) throw caseLen.error;

  // 1. Derive recommended actions from the intelligence stack
  const actions = deriveRecommendedActions(input);
  const allActions = [...actions, ...(input.additionalRecommendedActions ?? [])];

  // 2. Compute readiness checks
  const readiness = computeReadiness(input);

  // 3. Determine overall case status
  const overallStatus = determineCaseStatus(input, readiness, allActions);

  // 4. Get risk level
  const riskLevel: RiskLevel = input.riskAssessment?.overallRisk ?? "unknown";

  // 5. Generate summary (convenience, not primary representation)
  const summary = generateCaseSummary(overallStatus, riskLevel, readiness, allActions);

  return {
    id: createId(crypto.randomUUID()),
    caseId: input.caseId,
    overallStatus,
    riskLevel,
    readiness,
    recommendedActions: allActions,
    summary,
    assessedAt: new Date().toISOString(),
    provenance: createProvenance({ level: "rule_derived", ruleId: "case-assessment-engine" }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDED ACTION DERIVATION (deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

function deriveRecommendedActions(input: CaseAssessmentInput): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const prov = { level: "rule_derived" as const, ruleId: "case-assessment-engine" };

  // 1. Critical unresolved findings → action to address them
  const criticalFindings = input.findings.filter(
    (f) => isFindingActive(f) && isFindingCritical(f) && !f.verified,
  );
  if (criticalFindings.length > 0) {
    actions.push(createRecommendedAction({
      actionType: "address_critical_findings",
      priority: "critical",
      description: `Address ${criticalFindings.length} critical finding(s) before proceeding`,
      expectedOutcome: "All critical findings are resolved or verified",
      relatedFindingIds: criticalFindings.map((f) => f.id),
      provenance: prov,
    }));
  }

  // 2. Major unresolved findings → action to review them
  const majorFindings = input.findings.filter(
    (f) => isFindingActive(f) && isFindingMajor(f) && !f.verified,
  );
  if (majorFindings.length > 0) {
    actions.push(createRecommendedAction({
      actionType: "review_major_findings",
      priority: "high",
      description: `Review ${majorFindings.length} major finding(s)`,
      expectedOutcome: "All major findings are reviewed and resolved or dismissed",
      relatedFindingIds: majorFindings.map((f) => f.id),
      provenance: prov,
    }));
  }

  // 3. Unresolved contradictions → action to resolve
  const unresolvedContradictions = input.contradictions.filter((c) => !isResolved(c));
  const criticalContradictions = unresolvedContradictions.filter(isCritical);
  const majorContradictions = unresolvedContradictions.filter(isMajor);

  if (criticalContradictions.length > 0) {
    actions.push(createRecommendedAction({
      actionType: "resolve_critical_contradictions",
      priority: "critical",
      description: `Resolve ${criticalContradictions.length} critical contradiction(s)`,
      expectedOutcome: "All critical contradictions are resolved with clear resolution",
      relatedContradictionIds: criticalContradictions.map((c) => c.id),
      provenance: prov,
    }));
  }

  if (majorContradictions.length > 0) {
    actions.push(createRecommendedAction({
      actionType: "resolve_major_contradictions",
      priority: "high",
      description: `Resolve ${majorContradictions.length} major contradiction(s)`,
      expectedOutcome: "All major contradictions are reviewed and resolved",
      relatedContradictionIds: majorContradictions.map((c) => c.id),
      provenance: prov,
    }));
  }

  // 4. Missed deadlines → action to address
  if (input.deadlines) {
    const missed = input.deadlines.filter((d) => d.status === "missed");
    if (missed.length > 0) {
      actions.push(createRecommendedAction({
        actionType: "address_missed_deadlines",
        priority: "critical",
        description: `${missed.length} deadline(s) have been missed — determine if remediation is possible`,
        expectedOutcome: "Missed deadlines are addressed or documented as untimely",
        relatedDeadlineRuleIds: missed.map((d) => d.result.ruleId),
        provenance: prov,
      }));
    }

    const approaching = input.deadlines.filter((d) => d.status === "approaching");
    if (approaching.length > 0) {
      actions.push(createRecommendedAction({
        actionType: "prepare_for_approaching_deadlines",
        priority: "high",
        description: `${approaching.length} deadline(s) approaching within 7 days — prioritize completion`,
        expectedOutcome: "All approaching deadlines are met",
        relatedDeadlineRuleIds: approaching.map((d) => d.result.ruleId),
        provenance: prov,
      }));
    }
  }

  // 5. Insufficient evidence → action to add evidence
  if (input.evidenceItems && input.findings.length > 0) {
    const activeFindings = input.findings.filter(isFindingActive).filter((f) => !isFindingRetracted(f));
    if (input.evidenceItems.length < activeFindings.length) {
      actions.push(createRecommendedAction({
        actionType: "add_supporting_evidence",
        priority: "medium",
        description: `Add evidence: only ${input.evidenceItems.length} evidence item(s) for ${activeFindings.length} finding(s)`,
        expectedOutcome: "Each finding has at least one supporting evidence item",
        relatedFindingIds: activeFindings.map((f) => f.id),
        provenance: prov,
      }));
    }
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// READINESS COMPUTATION (deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

function buildCheck(
  id: string,
  label: string,
  description: string,
  status: CheckStatus,
  detail?: string,
  fixAction?: string,
): ReadinessCheck {
  return createReadinessCheck({
    id,
    label,
    description,
    status,
    ...(detail ? { detail } : {}),
    ...(fixAction ? { fixAction } : {}),
  });
}

function computeReadiness(input: CaseAssessmentInput): ReadinessResult {
  const checks: ReadinessCheck[] = [];

  // 1. Deadline check
  if (input.deadlines && input.deadlines.length > 0) {
    const hasMissed = input.deadlines.some((d) => d.status === "missed");
    const hasApproaching = input.deadlines.some((d) => d.status === "approaching");
    if (hasMissed) {
      checks.push(buildCheck("deadline_status", "Deadline Status", "No deadlines have been missed.", "fail", "At least one deadline has been missed.", "Determine if remediation is possible for missed deadlines."));
    } else if (hasApproaching) {
      checks.push(buildCheck("deadline_status", "Deadline Status", "No deadlines have been missed.", "warning", "Deadlines approaching within 7 days.", "Prioritize completing approaching deadlines."));
    } else {
      checks.push(buildCheck("deadline_status", "Deadline Status", "No deadlines have been missed.", "pass"));
    }
  } else {
    checks.push(buildCheck("deadline_status", "Deadline Status", "No deadlines configured for this case.", "warning", "No deadline rules have been applied. Verify whether deadlines apply."));
  }

  // 2. Critical findings check
  const criticalFindings = input.findings.filter(
    (f) => isFindingActive(f) && isFindingCritical(f) && !f.verified,
  );
  if (criticalFindings.length > 0) {
    checks.push(buildCheck("critical_findings", "Critical Findings Resolved", "No unresolved critical findings.", "fail", `${criticalFindings.length} unresolved critical finding(s).`, "Address all critical findings before proceeding."));
  } else {
    checks.push(buildCheck("critical_findings", "Critical Findings Resolved", "No unresolved critical findings.", "pass"));
  }

  // 3. Contradictions check
  const unresolvedContradictions = input.contradictions.filter((c) => !isResolved(c));
  const criticalContradictions = unresolvedContradictions.filter(isCritical);
  if (criticalContradictions.length > 0) {
    checks.push(buildCheck("contradictions", "Contradictions Resolved", "No unresolved critical contradictions.", "fail", `${criticalContradictions.length} unresolved critical contradiction(s).`, "Resolve all critical contradictions."));
  } else if (unresolvedContradictions.length > 0) {
    checks.push(buildCheck("contradictions", "Contradictions Resolved", "No unresolved critical contradictions.", "warning", `${unresolvedContradictions.length} unresolved contradiction(s).`));
  } else {
    checks.push(buildCheck("contradictions", "Contradictions Resolved", "No unresolved critical contradictions.", "pass"));
  }

  // 4. Evidence coverage check
  if (input.evidenceItems && input.findings.length > 0) {
    const activeFindings = input.findings.filter(isFindingActive).filter((f) => !isFindingRetracted(f));
    const sufficient = input.evidenceItems.length >= activeFindings.length;
    if (sufficient) {
      checks.push(buildCheck("evidence_coverage", "Evidence Coverage", "Sufficient evidence for all findings.", "pass"));
    } else {
      checks.push(buildCheck("evidence_coverage", "Evidence Coverage", "Sufficient evidence for all findings.", "warning", `Only ${input.evidenceItems.length} evidence item(s) for ${activeFindings.length} finding(s).`, "Add supporting evidence for uncovered findings."));
    }
  } else if (input.findings.length === 0) {
    checks.push(buildCheck("evidence_coverage", "Evidence Coverage", "No findings to support with evidence.", "pass"));
  }

  // 5. Information availability check
  const hasFindings = input.findings.length > 0;
  const hasContradictions = input.contradictions.length > 0;
  const hasEvidence = input.evidenceItems !== undefined && input.evidenceItems.length > 0;
  const hasDeadlines = input.deadlines !== undefined && input.deadlines.length > 0;
  const hasAnyInfo = hasFindings || hasContradictions || hasEvidence || hasDeadlines;
  if (hasAnyInfo) {
    checks.push(buildCheck("information_available", "Information Available", "Sufficient information to assess the case.", "pass"));
  } else {
    checks.push(buildCheck("information_available", "Information Available", "Sufficient information to assess the case.", "warning", "No findings, contradictions, evidence, or deadlines available.", "Upload documents and run analysis to generate intelligence."));
  }

  // Merge with additional checks from verticals
  const allChecks = [...checks, ...(input.additionalReadinessChecks ?? [])];

  // Compute score: each pass=100, warning=50, fail=0, then average
  const scores: number[] = allChecks.map((c) => {
    if (c.status === "pass") return 100;
    if (c.status === "warning") return 50;
    return 0;
  });
  const score = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : 0;

  const issuesRequiringAttention = allChecks.filter((c) => c.status === "fail").length;
  const ready = score >= READINESS_THRESHOLD && issuesRequiringAttention === 0;

  return { score, checks: allChecks, issuesRequiringAttention, ready };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE STATUS DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

function determineCaseStatus(
  input: CaseAssessmentInput,
  readiness: ReadinessResult,
  actions: readonly RecommendedAction[],
): CaseStatus {
  // Submitted cases are submitted
  if (input.submitted) return "submitted";

  // If there are any fail checks, action is required (even on an otherwise empty case)
  if (readiness.issuesRequiringAttention > 0) return "action_required";

  // If there's no information at all, it's a draft regardless of readiness
  const hasFindings = input.findings.length > 0;
  const hasContradictions = input.contradictions.length > 0;
  const hasEvidence = input.evidenceItems !== undefined && input.evidenceItems.length > 0;
  const hasDeadlines = input.deadlines !== undefined && input.deadlines.length > 0;
  const hasAnyInfo = hasFindings || hasContradictions || hasEvidence || hasDeadlines;
  if (!hasAnyInfo) return "draft";

  // If there are pending critical/high actions, action is required
  const hasCriticalActions = actions.some(
    (a) => a.status === "pending" && (a.priority === "critical" || a.priority === "high"),
  );
  if (hasCriticalActions) return "action_required";

  // If readiness is ready, the case is ready
  if (readiness.ready) return "ready";

  // If there's some information but not ready, it's in review
  if (hasAnyInfo) {
    return "in_review";
  }

  // No information → draft (already handled above, but kept for completeness)
  return "draft";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY GENERATION (convenience, not primary representation)
// ═══════════════════════════════════════════════════════════════════════════════

function generateCaseSummary(
  status: CaseStatus,
  riskLevel: RiskLevel,
  readiness: ReadinessResult,
  actions: readonly RecommendedAction[],
): string {
  const parts: string[] = [];
  parts.push(`Case status: ${status.toUpperCase()}.`);
  parts.push(`Risk level: ${riskLevel.toUpperCase()}.`);
  parts.push(`Readiness score: ${readiness.score}/100 (${readiness.ready ? "ready" : "not ready"}).`);

  const pendingActions = actions.filter(isActionPending);
  if (pendingActions.length > 0) {
    const critical = pendingActions.filter((a) => a.priority === "critical").length;
    const high = pendingActions.filter((a) => a.priority === "high").length;
    if (critical > 0) parts.push(`${critical} critical action(s) pending.`);
    if (high > 0) parts.push(`${high} high-priority action(s) pending.`);
  }

  if (readiness.issuesRequiringAttention > 0) {
    parts.push(`${readiness.issuesRequiringAttention} readiness issue(s) requiring attention.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateCaseAssessment(a: CaseAssessment): Result<void, ValidationError> {
  if (!a.caseId || a.caseId.trim().length === 0) {
    return err(new ValidationError("CaseAssessment caseId must not be empty"));
  }
  if (!ALL_CASE_STATUSES.includes(a.overallStatus)) {
    return err(new ValidationError(`Invalid case status: ${a.overallStatus}`));
  }
  if (typeof a.readiness.score !== "number" || isNaN(a.readiness.score) || a.readiness.score < 0 || a.readiness.score > 100) {
    return err(new ValidationError("Readiness score must be 0-100"));
  }
  if (a.summary.length > MAX_ASSESSMENT_SUMMARY) {
    return err(new ValidationError(`CaseAssessment summary exceeds ${MAX_ASSESSMENT_SUMMARY} chars`));
  }
  for (const action of a.recommendedActions) {
    const actionResult = validateRecommendedAction(action);
    if (!actionResult.ok) return actionResult;
  }
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export function pendingActions(assessment: CaseAssessment): RecommendedAction[] {
  return assessment.recommendedActions.filter(isActionPending);
}

export function criticalActions(assessment: CaseAssessment): RecommendedAction[] {
  return pendingActions(assessment).filter((a) => a.priority === "critical");
}

export function highPriorityActions(assessment: CaseAssessment): RecommendedAction[] {
  return pendingActions(assessment).filter((a) => a.priority === "high");
}

export function failedChecks(assessment: CaseAssessment): ReadinessCheck[] {
  return assessment.readiness.checks.filter((c) => c.status === "fail");
}

export function warningChecks(assessment: CaseAssessment): ReadinessCheck[] {
  return assessment.readiness.checks.filter((c) => c.status === "warning");
}

export function isCaseReady(assessment: CaseAssessment): boolean {
  return assessment.overallStatus === "ready";
}

export function isActionRequired(assessment: CaseAssessment): boolean {
  return assessment.overallStatus === "action_required";
}

/**
 * Explain the assessment in a human-readable format.
 * This traces each recommendation back to underlying intelligence.
 */
export function explainAssessment(assessment: CaseAssessment): string {
  const lines: string[] = [];
  lines.push(`Case ${assessment.caseId}: ${assessment.overallStatus.toUpperCase()}`);
  lines.push(`Risk: ${assessment.riskLevel.toUpperCase()}, Readiness: ${assessment.readiness.score}/100`);

  if (assessment.readiness.issuesRequiringAttention > 0) {
    lines.push(`\nIssues requiring attention (${assessment.readiness.issuesRequiringAttention}):`);
    for (const check of failedChecks(assessment)) {
      lines.push(`  - ${check.label}: ${check.detail ?? check.description}`);
      if (check.fixAction) lines.push(`    Fix: ${check.fixAction}`);
    }
  }

  const pending = pendingActions(assessment);
  if (pending.length > 0) {
    lines.push(`\nRecommended actions (${pending.length}):`);
    for (const action of pending) {
      lines.push(`  [${action.priority.toUpperCase()}] ${action.description}`);
      lines.push(`    Expected outcome: ${action.expectedOutcome}`);
      if (action.relatedFindingIds) lines.push(`    Related findings: ${action.relatedFindingIds.join(", ")}`);
      if (action.relatedContradictionIds) lines.push(`    Related contradictions: ${action.relatedContradictionIds.join(", ")}`);
      if (action.relatedDeadlineRuleIds) lines.push(`    Related deadlines: ${action.relatedDeadlineRuleIds.join(", ")}`);
    }
  }

  return lines.join("\n");
}

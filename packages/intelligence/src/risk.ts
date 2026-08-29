/**
 * @mailmypdf/intelligence — Risk Assessment Engine.
 *
 * A RiskAssessment is a DERIVED evaluation of case risk based on the state
 * of the intelligence stack. It is NOT a source of truth.
 *
 * Architecture:
 *   Facts + Evidence + Findings + Contradictions + Deadlines + Temporal state
 *     → Risk Assessment
 *       → Risk Factors (each traceable to underlying intelligence)
 *         → Recommended Actions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHAT THE SCORE REPRESENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A risk score does NOT mean:
 *   "This case is definitely invalid."
 *
 * It means:
 *   "Based on currently available evidence and rules, this situation
 *    presents a measured level of risk."
 *
 * Risk ≠ Confidence: confidence is how sure we are about a specific fact.
 * Risk ≠ Evidence Quality: evidence quality is how reliable a source is.
 * Risk ≠ Factual Certainty: factual certainty is whether a fact is true.
 * Risk = aggregate assessment of what could go wrong based on the intelligence.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * RISK vs INSUFFICIENT INFORMATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LOW risk means: "We assessed the case and found no significant risk factors."
 * UNKNOWN risk means: "We don't have enough information to make an assessment."
 *
 * This distinction is critical. A case with no findings, no contradictions,
 * no deadlines, and no evidence is UNKNOWN — not LOW. We haven't checked
 * anything because there's nothing to check.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DETERMINISTIC FIRST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Risk computation is DETERMINISTIC — no LLM required. AI can later suggest
 * additional factors, but the core engine works without AI.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPLAINABILITY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Every risk factor is explainable:
 *   "Why is this high risk?"
 *   → Risk Factor A: missed deadline
 *     → Deadline → Event → Fact → Evidence → Document
 *   → Risk Factor B: unresolved contradiction
 *     → Contradiction → Facts → Evidence → Documents
 *
 * No opaque assessments. Every factor traces to the intelligence that caused it.
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
import { isFindingCritical, isFindingMajor, isFindingActive, isFindingRetracted } from "./finding.js";
import type { Contradiction } from "./contradiction.js";
import { isCritical, isMajor, isResolved, isUnreviewed } from "./contradiction.js";
import type { DeadlineResult, DeadlineStatus } from "./deadline.js";
import type { EvidenceItem } from "./evidence.js";
import type { TimelineEvent } from "./timeline.js";

// ═══════════════════════════════════════════════════════════════════════════════
// RISK LEVEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Risk levels, ordered by severity:
 *   critical — immediate action required (missed deadlines, critical unresolved issues)
 *   high     — urgent attention needed (approaching deadlines, major unresolved issues)
 *   medium   — should be addressed (insufficient evidence, minor issues)
 *   low      — no significant risk factors found (assessment was possible)
 *   unknown  — insufficient information to assess (nothing to evaluate)
 *
 * "unknown" is distinct from "low": unknown means we couldn't assess,
 * low means we assessed and found no significant risk.
 */
export type RiskLevel = "critical" | "high" | "medium" | "low" | "unknown";

export const ALL_RISK_LEVELS: readonly RiskLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
  "unknown",
] as const;

export const RISK_LEVEL_WEIGHT: Readonly<Record<RiskLevel, number>> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RISK FACTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A single risk factor with full traceability to the underlying intelligence.
 *
 * Each factor records:
 *   - type: what kind of risk (e.g., "missed_deadline", "unresolved_contradiction")
 *   - severity: how serious (critical/high/medium/low)
 *   - description: human-readable explanation
 *   - itemCount: how many items contributed
 *   - itemIds: IDs of the underlying intelligence objects
 *   - derivation: provenance chain tracing back to source documents
 *   - sourceRefs: source references from the underlying intelligence
 */
export interface RiskFactor {
  readonly factorType: string;
  readonly description: string;
  readonly severity: RiskLevel;
  readonly itemCount: number;
  readonly itemIds: readonly PlatformId[];
  /** Provenance chain tracing this factor back to its source intelligence */
  readonly derivation: ProvenanceRecord;
  /** Source references from the underlying intelligence objects */
  readonly sourceRefs?: readonly SourceRef[];
}

export const MAX_FACTOR_DESCRIPTION = 500;
export const MAX_FACTORS_PER_ASSESSMENT = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RiskAssessment {
  readonly caseId: string;
  /** Overall risk level (critical/high/medium/low/unknown) */
  readonly overallRisk: RiskLevel;
  /**
   * Numeric risk score (0-100). 0 = no risk factors, 100 = maximum risk.
   * This is a DETERMINISTIC score based on factor severity and count.
   * It does NOT represent factual certainty or confidence.
   */
  readonly riskScore: number;
  /** Individual risk factors, each traceable to underlying intelligence */
  readonly factors: readonly RiskFactor[];
  /** Human-readable summary of the assessment */
  readonly summary: string;
  /** Whether there was sufficient information to make an assessment */
  readonly sufficientInformation: boolean;
  readonly assessedAt: string;
  readonly provenance: ProvenanceRecord;
}

export const MAX_SUMMARY_LENGTH = 2000;
export const MAX_CASE_ID_LENGTH = 200;

// ═══════════════════════════════════════════════════════════════════════════════
// RISK ASSESSMENT INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RiskAssessmentInput {
  caseId: string;
  findings: readonly Finding[];
  contradictions: readonly Contradiction[];
  deadlines?: readonly { result: DeadlineResult; status: DeadlineStatus }[];
  evidenceItems?: readonly EvidenceItem[];
  timelineEvents?: readonly TimelineEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK ASSESSMENT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a RiskAssessment from the state of the intelligence stack.
 *
 * This is a DETERMINISTIC computation — no AI involved.
 *
 * Returns "unknown" risk level when there is insufficient information to
 * assess (no findings, no contradictions, no deadlines, no evidence).
 */
export function computeRiskAssessment(input: RiskAssessmentInput): RiskAssessment {
  const caseCheck = validateNonEmpty(input.caseId, "caseId");
  if (!caseCheck.ok) throw caseCheck.error;
  const caseLen = validateMaxLength(input.caseId, "caseId", MAX_CASE_ID_LENGTH);
  if (!caseLen.ok) throw caseLen.error;

  // Check if we have sufficient information to assess
  const hasFindings = input.findings.length > 0;
  const hasContradictions = input.contradictions.length > 0;
  const hasDeadlines = input.deadlines !== undefined && input.deadlines.length > 0;
  const hasEvidence = input.evidenceItems !== undefined && input.evidenceItems.length > 0;
  const hasTimeline = input.timelineEvents !== undefined && input.timelineEvents.length > 0;
  const sufficientInformation = hasFindings || hasContradictions || hasDeadlines || hasEvidence || hasTimeline;

  const factors: RiskFactor[] = [];

  // 1. Critical unresolved findings
  const criticalFindings = input.findings.filter(
    (f) => isFindingActive(f) && isFindingCritical(f) && !f.verified,
  );
  if (criticalFindings.length > 0) {
    factors.push({
      factorType: "unresolved_critical_findings",
      description: `${criticalFindings.length} unresolved critical finding(s) requiring review`,
      severity: "critical",
      itemCount: criticalFindings.length,
      itemIds: criticalFindings.map((f) => f.id),
      derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      sourceRefs: criticalFindings.flatMap((f) => f.provenance.sourceRefs ?? []),
    });
  }

  // 2. Major unresolved findings
  const majorFindings = input.findings.filter(
    (f) => isFindingActive(f) && isFindingMajor(f) && !f.verified,
  );
  if (majorFindings.length > 0) {
    factors.push({
      factorType: "unresolved_major_findings",
      description: `${majorFindings.length} unresolved major finding(s) requiring review`,
      severity: "high",
      itemCount: majorFindings.length,
      itemIds: majorFindings.map((f) => f.id),
      derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      sourceRefs: majorFindings.flatMap((f) => f.provenance.sourceRefs ?? []),
    });
  }

  // 3. Critical unresolved contradictions
  const criticalContradictions = input.contradictions.filter(
    (c) => isCritical(c) && !isResolved(c),
  );
  if (criticalContradictions.length > 0) {
    factors.push({
      factorType: "unresolved_critical_contradictions",
      description: `${criticalContradictions.length} unresolved critical contradiction(s)`,
      severity: "critical",
      itemCount: criticalContradictions.length,
      itemIds: criticalContradictions.map((c) => c.id),
      derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      sourceRefs: criticalContradictions.flatMap((c) => c.provenance.sourceRefs ?? []),
    });
  }

  // 4. Major unresolved contradictions
  const majorContradictions = input.contradictions.filter(
    (c) => isMajor(c) && !isResolved(c),
  );
  if (majorContradictions.length > 0) {
    factors.push({
      factorType: "unresolved_major_contradictions",
      description: `${majorContradictions.length} unresolved major contradiction(s)`,
      severity: "high",
      itemCount: majorContradictions.length,
      itemIds: majorContradictions.map((c) => c.id),
      derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      sourceRefs: majorContradictions.flatMap((c) => c.provenance.sourceRefs ?? []),
    });
  }

  // 5. Missed deadlines (does NOT recalculate — consumes DeadlineEngine output)
  if (input.deadlines) {
    const missed = input.deadlines.filter((d) => d.status === "missed");
    if (missed.length > 0) {
      factors.push({
        factorType: "missed_deadlines",
        description: `${missed.length} missed deadline(s)`,
        severity: "critical",
        itemCount: missed.length,
        itemIds: missed.map((d) => d.result.ruleId),
        derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      });
    }

    const approaching = input.deadlines.filter((d) => d.status === "approaching");
    if (approaching.length > 0) {
      factors.push({
        factorType: "approaching_deadlines",
        description: `${approaching.length} approaching deadline(s) within 7 days`,
        severity: "high",
        itemCount: approaching.length,
        itemIds: approaching.map((d) => d.result.ruleId),
        derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      });
    }
  }

  // 6. Low evidence coverage (more active findings than evidence items)
  if (input.evidenceItems && input.findings.length > 0) {
    const activeFindings = input.findings.filter(isFindingActive).filter((f) => !isFindingRetracted(f));
    const evidenceCount = input.evidenceItems.length;
    if (evidenceCount < activeFindings.length) {
      factors.push({
        factorType: "insufficient_evidence",
        description: `Only ${evidenceCount} evidence item(s) for ${activeFindings.length} active finding(s)`,
        severity: "medium",
        itemCount: activeFindings.length - evidenceCount,
        itemIds: activeFindings.map((f) => f.id),
        derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      });
    }
  }

  // 7. Uncertain timeline (events with unknown dates)
  if (input.timelineEvents) {
    const unknownDateEvents = input.timelineEvents.filter(
      (e) => e.status === "active" && e.datePrecision === "unknown",
    );
    if (unknownDateEvents.length > 3) {
      factors.push({
        factorType: "uncertain_timeline",
        description: `${unknownDateEvents.length} timeline event(s) with unknown dates`,
        severity: "medium",
        itemCount: unknownDateEvents.length,
        itemIds: unknownDateEvents.map((e) => e.id),
        derivation: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
      });
    }
  }

  if (factors.length > MAX_FACTORS_PER_ASSESSMENT) {
    throw new Error(`Risk assessment exceeds ${MAX_FACTORS_PER_ASSESSMENT} factors`);
  }

  // Compute overall risk level and score
  const { overallRisk, riskScore } = computeOverallRisk(factors, sufficientInformation);
  const summary = generateSummary(overallRisk, factors, sufficientInformation);

  return {
    caseId: input.caseId,
    overallRisk,
    riskScore,
    factors,
    summary,
    sufficientInformation,
    assessedAt: new Date().toISOString(),
    provenance: createProvenance({ level: "rule_derived", ruleId: "risk-assessment-engine" }),
  };
}

/**
 * Compute overall risk level and score from factors.
 *
 * Score formula:
 *   For each factor: weight(severity) × min(itemCount, 10)
 *   Total: min(sum, 100)
 *
 * The min(itemCount, 10) cap prevents a single factor type from
 * dominating the score with a huge item count.
 *
 * The overall level is the highest severity among all factors.
 * If no factors and sufficient information → low (we checked, no issues).
 * If no factors and insufficient information → unknown (nothing to check).
 */
function computeOverallRisk(
  factors: readonly RiskFactor[],
  sufficientInformation: boolean,
): { overallRisk: RiskLevel; riskScore: number } {
  if (factors.length === 0) {
    return {
      overallRisk: sufficientInformation ? "low" : "unknown",
      riskScore: 0,
    };
  }

  let score = 0;
  let hasCritical = false;
  let hasHigh = false;
  let hasMedium = false;

  for (const f of factors) {
    score += RISK_LEVEL_WEIGHT[f.severity] * Math.min(f.itemCount, 10);
    if (f.severity === "critical") hasCritical = true;
    if (f.severity === "high") hasHigh = true;
    if (f.severity === "medium") hasMedium = true;
  }

  let overallRisk: RiskLevel;
  if (hasCritical) overallRisk = "critical";
  else if (hasHigh) overallRisk = "high";
  else if (hasMedium) overallRisk = "medium";
  else overallRisk = "low";

  return { overallRisk, riskScore: Math.min(score, 100) };
}

function generateSummary(level: RiskLevel, factors: readonly RiskFactor[], sufficient: boolean): string {
  if (!sufficient) {
    return "Insufficient information to assess risk. No findings, contradictions, deadlines, or evidence available for this case.";
  }
  if (factors.length === 0) {
    return "No risk factors identified. The case intelligence stack shows no unresolved critical findings, contradictions, or deadline issues.";
  }

  const factorDescriptions = factors.map(
    (f) => `${f.severity.toUpperCase()}: ${f.description}`,
  );
  return `Overall risk: ${level.toUpperCase()}. Risk factors: ${factorDescriptions.join("; ")}.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validateRiskAssessment(r: RiskAssessment): Result<void, ValidationError> {
  if (!r.caseId || r.caseId.trim().length === 0) {
    return err(new ValidationError("RiskAssessment caseId must not be empty"));
  }
  if (!ALL_RISK_LEVELS.includes(r.overallRisk)) {
    return err(new ValidationError(`Invalid risk level: ${r.overallRisk}`));
  }
  if (typeof r.riskScore !== "number" || isNaN(r.riskScore) || r.riskScore < 0 || r.riskScore > 100) {
    return err(new ValidationError("RiskAssessment riskScore must be 0-100"));
  }
  if (r.factors.length > MAX_FACTORS_PER_ASSESSMENT) {
    return err(new ValidationError(`RiskAssessment exceeds ${MAX_FACTORS_PER_ASSESSMENT} factors`));
  }
  if (r.summary.length > MAX_SUMMARY_LENGTH) {
    return err(new ValidationError(`RiskAssessment summary exceeds ${MAX_SUMMARY_LENGTH} chars`));
  }
  for (const f of r.factors) {
    if (!f.factorType || f.factorType.trim().length === 0) {
      return err(new ValidationError("RiskFactor factorType must not be empty"));
    }
    if (!ALL_RISK_LEVELS.includes(f.severity)) {
      return err(new ValidationError(`Invalid risk factor severity: ${f.severity}`));
    }
    if (f.description.length > MAX_FACTOR_DESCRIPTION) {
      return err(new ValidationError(`RiskFactor description exceeds ${MAX_FACTOR_DESCRIPTION} chars`));
    }
    if (typeof f.itemCount !== "number" || f.itemCount < 0) {
      return err(new ValidationError("RiskFactor itemCount must be non-negative"));
    }
  }
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export function isCriticalRisk(r: RiskAssessment): boolean {
  return r.overallRisk === "critical";
}

export function isHighRisk(r: RiskAssessment): boolean {
  return r.overallRisk === "high";
}

export function isLowRisk(r: RiskAssessment): boolean {
  return r.overallRisk === "low";
}

export function isUnknownRisk(r: RiskAssessment): boolean {
  return r.overallRisk === "unknown";
}

export function criticalFactors(r: RiskAssessment): RiskFactor[] {
  return r.factors.filter((f) => f.severity === "critical");
}

export function highFactors(r: RiskAssessment): RiskFactor[] {
  return r.factors.filter((f) => f.severity === "high");
}

/**
 * Explain a risk factor by returning its derivation chain.
 * Consumers can use this to display "Why is this high risk?" explanations.
 */
export function explainFactor(factor: RiskFactor): string {
  const items = factor.itemIds.length > 0
    ? ` (items: ${factor.itemIds.slice(0, 5).join(", ")}${factor.itemIds.length > 5 ? "..." : ""})`
    : "";
  return `${factor.severity.toUpperCase()} risk: ${factor.description}${items}`;
}

/**
 * Explain an entire risk assessment.
 */
export function explainAssessment(r: RiskAssessment): string {
  if (r.factors.length === 0) {
    return r.sufficientInformation
      ? "No risk factors found. The assessment was possible and no significant risks were identified."
      : "Insufficient information to assess risk.";
  }
  return r.factors.map(explainFactor).join("\n");
}

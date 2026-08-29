/**
 * @mailmypdf/intelligence — Contradiction model.
 *
 * A Contradiction is a formal record that two facts conflict with each other.
 * It does NOT resolve which fact is true — it preserves the conflict for
 * human review or downstream automated resolution.
 *
 * Key distinction: CONFIRMED vs POTENTIAL contradiction.
 *
 *   CONFIRMED: Two facts with the same subject + predicate but different
 *   values where the predicate is inherently singular (deadline, amount, date).
 *   Only one value can be correct.
 *
 *   POTENTIAL: Two facts with the same subject + predicate but different
 *   values where the predicate MIGHT allow multiple values (address, phone,
 *   employer). The system cannot determine if this is a real contradiction
 *   or a historical change without human review.
 *
 * This distinction prevents false positives where non-contradictory
 * historical values are flagged as conflicts.
 *
 * This builds directly on:
 *   - Fact (the two conflicting facts, already detectable via findConflictingFacts)
 *   - Evidence (evidence supporting each side, via evidenceForClaim)
 *   - Provenance (where the contradiction was detected)
 *
 * Contradiction ≠ Fact: it doesn't assert anything. It records a conflict.
 * Contradiction ≠ Relationship: it has severity, review status, and resolution semantics.
 * Contradiction ≠ Evidence: evidence links claims to sources. Contradiction links claims to each other.
 */

import {
  type PlatformId,
  createId,
  confidence as mkConfidence,
  validateNonEmpty,
  validateMaxLength,
  ok,
  err,
  type Result,
  ValidationError,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import type { ProvenanceLevel } from "./provenance.js";
import { createProvenance, verifyProvenance } from "./provenance.js";
import type { IntelligenceObject } from "./provenance.js";
import type { Fact } from "./fact.js";
import { findConflictingFacts } from "./fact.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

export type ContradictionSeverity =
  | "critical"   // Conflicting deadlines or amounts — directly affects case outcome
  | "major"      // Conflicting factual claims — needs resolution before proceeding
  | "minor";     // Minor discrepancies — note but don't block

export const ALL_SEVERITY_LEVELS: readonly ContradictionSeverity[] = [
  "critical",
  "major",
  "minor",
] as const;

export const SEVERITY_WEIGHT: Readonly<Record<ContradictionSeverity, number>> = {
  critical: 3,
  major: 2,
  minor: 1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CONFIRMED: The predicate is inherently singular (deadline, amount, date).
 * Two different values for the same subject + predicate is a definite contradiction.
 *
 * POTENTIAL: The predicate MIGHT allow multiple values over time (address, phone,
 * employer). Two different values might be a historical change, not a contradiction.
 * Human review is required to determine if this is a real conflict.
 */
export type DetectionType = "confirmed" | "potential";

// ── Predicate classification ──────────────────────────────────────────────────

/**
 * Predicates that are inherently singular — only one value can be correct
 * at any point in time. Two different values is a CONFIRMED contradiction.
 */
const SINGULAR_PREDICATES = new Set([
  "has_deadline", "deadline", "response_deadline", "filing_deadline",
  "has_amount", "amount", "debt_amount", "payment_amount", "balance",
  "has_date", "filing_date", "hearing_date", "decision_date", "birth_date",
  "case_number", "account_number", "filing_fee",
  "debt_owed", "eligibility", "status",
]);

/**
 * Predicates that MIGHT allow multiple valid values over time.
 * Two different values is a POTENTIAL contradiction requiring review.
 *
 * Examples: address (moved), phone (changed), employer (changed jobs),
 * income (changed over time).
 */
const MULTI_VALUED_PREDICATES = new Set([
  "address", "previous_address", "phone", "email",
  "employer", "income", "salary", "occupation",
  "name", "alias", "spouse_name",
]);

/**
 * Classify a predicate as singular or potentially multi-valued.
 * Unknown predicates default to "potential" — safer to ask for review.
 */
export function classifyPredicate(predicate: string): DetectionType {
  const lower = predicate.toLowerCase();
  if (SINGULAR_PREDICATES.has(lower)) return "confirmed";
  if (MULTI_VALUED_PREDICATES.has(lower)) return "potential";
  // Unknown predicates default to potential — safer
  return "potential";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION REVIEW STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export type ReviewStatus = "unreviewed" | "reviewed" | "resolved";

export type Resolution = "factA_accepted" | "factB_accepted" | "both_preserved" | "both_rejected";

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum number of facts that detectContradictions will process. */
export const MAX_FACTS_FOR_DETECTION = 1000;

/** Maximum number of pairwise contradictions per subject+predicate group. */
export const MAX_PAIRS_PER_GROUP = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface Contradiction extends IntelligenceObject {
  /** The first conflicting fact */
  readonly factAId: PlatformId;
  /** The second conflicting fact */
  readonly factBId: PlatformId;
  /** What aspect conflicts (same subject + predicate, different values) */
  readonly conflictSubject: string;
  readonly conflictPredicate: string;
  /** How the facts differ */
  readonly factAValue: string;
  readonly factBValue: string;
  /** Severity of the contradiction */
  readonly severity: ContradictionSeverity;
  /** Whether this is a confirmed or potential contradiction */
  readonly detectionType: DetectionType;
  /** Review status */
  readonly reviewStatus: ReviewStatus;
  /** If resolved, how it was resolved */
  readonly resolution?: Resolution | undefined;
  /** Optional human-readable explanation */
  readonly explanation?: string | undefined;
  /** Optional reviewer identity */
  readonly reviewedBy?: string | undefined;
}

export const MAX_CONTRADICTION_EXPLANATION = 2000;
export const MAX_CONFLICT_SUBJECT = 200;
export const MAX_CONFLICT_PREDICATE = 100;

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateContradictionInput {
  id?: string;
  factAId: string;
  factBId: string;
  conflictSubject: string;
  conflictPredicate: string;
  factAValue: string;
  factBValue: string;
  severity: ContradictionSeverity;
  detectionType?: DetectionType;
  explanation?: string;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createContradiction(input: CreateContradictionInput): Contradiction {
  const factACheck = validateNonEmpty(input.factAId, "factAId");
  if (!factACheck.ok) throw factACheck.error;

  const factBCheck = validateNonEmpty(input.factBId, "factBId");
  if (!factBCheck.ok) throw factBCheck.error;

  if (input.factAId === input.factBId) {
    throw new Error("Cannot create a contradiction between a fact and itself");
  }

  const subjectCheck = validateNonEmpty(input.conflictSubject, "conflictSubject");
  if (!subjectCheck.ok) throw subjectCheck.error;
  const subjectLen = validateMaxLength(input.conflictSubject, "conflictSubject", MAX_CONFLICT_SUBJECT);
  if (!subjectLen.ok) throw subjectLen.error;

  const predCheck = validateNonEmpty(input.conflictPredicate, "conflictPredicate");
  if (!predCheck.ok) throw predCheck.error;
  const predLen = validateMaxLength(input.conflictPredicate, "conflictPredicate", MAX_CONFLICT_PREDICATE);
  if (!predLen.ok) throw predLen.error;

  if (!ALL_SEVERITY_LEVELS.includes(input.severity)) {
    throw new Error(`Invalid contradiction severity: ${input.severity}`);
  }

  if (input.explanation !== undefined) {
    const explLen = validateMaxLength(input.explanation, "explanation", MAX_CONTRADICTION_EXPLANATION);
    if (!explLen.ok) throw explLen.error;
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.7);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    factAId: createId(input.factAId),
    factBId: createId(input.factBId),
    conflictSubject: input.conflictSubject,
    conflictPredicate: input.conflictPredicate,
    factAValue: input.factAValue,
    factBValue: input.factBValue,
    severity: input.severity,
    detectionType: input.detectionType ?? "potential",
    reviewStatus: "unreviewed",
    provenance: prov,
    confidence: conf,
    verified: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Review ────────────────────────────────────────────────────────────────────

export function reviewContradiction(contradiction: Contradiction, reviewedBy: string): Contradiction {
  return {
    ...contradiction,
    reviewStatus: "reviewed" as ReviewStatus,
    reviewedBy,
    updatedAt: new Date().toISOString(),
  };
}

// ── Resolution ──────────────────────────────────────────────────────────────────

export function resolveContradiction(
  contradiction: Contradiction,
  resolution: Resolution,
  resolvedBy: string,
): Contradiction {
  return {
    ...contradiction,
    reviewStatus: "resolved" as ReviewStatus,
    resolution,
    reviewedBy: resolvedBy,
    provenance: verifyProvenance(contradiction.provenance, resolvedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateContradiction(c: Contradiction): Result<void, ValidationError> {
  if (!c.factAId || c.factAId.trim().length === 0) {
    return err(new ValidationError("Contradiction factAId must not be empty"));
  }
  if (!c.factBId || c.factBId.trim().length === 0) {
    return err(new ValidationError("Contradiction factBId must not be empty"));
  }
  if (c.factAId === c.factBId) {
    return err(new ValidationError("Cannot contradict a fact with itself"));
  }
  if (!ALL_SEVERITY_LEVELS.includes(c.severity)) {
    return err(new ValidationError(`Invalid contradiction severity: ${c.severity}`));
  }
  if (c.detectionType !== "confirmed" && c.detectionType !== "potential") {
    return err(new ValidationError(`Invalid detectionType: ${c.detectionType}`));
  }
  if (c.explanation !== undefined && c.explanation.length > MAX_CONTRADICTION_EXPLANATION) {
    return err(new ValidationError(`Contradiction explanation exceeds ${MAX_CONTRADICTION_EXPLANATION} chars`));
  }
  return ok(undefined);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function isUnreviewed(c: Contradiction): boolean {
  return c.reviewStatus === "unreviewed";
}

export function isReviewed(c: Contradiction): boolean {
  return c.reviewStatus === "reviewed";
}

export function isResolved(c: Contradiction): boolean {
  return c.reviewStatus === "resolved";
}

export function isCritical(c: Contradiction): boolean {
  return c.severity === "critical";
}

export function isMajor(c: Contradiction): boolean {
  return c.severity === "major";
}

export function isMinor(c: Contradiction): boolean {
  return c.severity === "minor";
}

export function isConfirmed(c: Contradiction): boolean {
  return c.detectionType === "confirmed";
}

export function isPotential(c: Contradiction): boolean {
  return c.detectionType === "potential";
}

export function contradictionsForFact(
  contradictions: readonly Contradiction[],
  factId: PlatformId,
): Contradiction[] {
  return contradictions.filter(
    (c) => c.factAId === factId || c.factBId === factId,
  );
}

export function unresolvedContradictions(
  contradictions: readonly Contradiction[],
): Contradiction[] {
  return contradictions.filter((c) => c.reviewStatus !== "resolved");
}

export function criticalContradictions(
  contradictions: readonly Contradiction[],
): Contradiction[] {
  return contradictions.filter((c) => c.severity === "critical" && c.reviewStatus !== "resolved");
}

export function confirmedContradictions(
  contradictions: readonly Contradiction[],
): Contradiction[] {
  return contradictions.filter((c) => c.detectionType === "confirmed");
}

export function potentialContradictions(
  contradictions: readonly Contradiction[],
): Contradiction[] {
  return contradictions.filter((c) => c.detectionType === "potential");
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRADICTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect contradictions from a set of facts.
 *
 * Uses findConflictingFacts (same subject + predicate, different values) and
 * classifies each as "confirmed" or "potential" based on the predicate.
 *
 * Resource safety:
 *   - Max MAX_FACTS_FOR_DETECTION facts (throws if exceeded)
 *   - Max MAX_PAIRS_PER_GROUP contradictions per subject+predicate group
 *
 * Severity inference:
 *   - Singular predicates (deadline, amount) → critical + confirmed
 *   - Multi-valued predicates (address, phone) → major + potential
 *   - Unknown predicates → major + potential (conservative default)
 */
export function detectContradictions(
  facts: readonly Fact[],
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    ruleId?: string;
  },
): Contradiction[] {
  if (facts.length > MAX_FACTS_FOR_DETECTION) {
    throw new Error(
      `detectContradictions received ${facts.length} facts, max is ${MAX_FACTS_FOR_DETECTION}`,
    );
  }

  const conflicts = findConflictingFacts(facts);
  if (conflicts.length === 0) return [];

  // Group conflicts by subject|predicate
  const groups = new Map<string, Fact[]>();
  for (const f of conflicts) {
    const key = `${f.subject}|${f.predicate}`;
    const group = groups.get(key) ?? [];
    group.push(f);
    groups.set(key, group);
  }

  const contradictions: Contradiction[] = [];
  for (const group of groups.values()) {
    let pairCount = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (pairCount >= MAX_PAIRS_PER_GROUP) break;

        const factA = group[i]!;
        const factB = group[j]!;
        if (factA.value === factB.value) continue;

        const detectionType = classifyPredicate(factA.predicate);
        const severity = inferSeverity(factA.predicate, detectionType);

        contradictions.push(
          createContradiction({
            factAId: factA.id,
            factBId: factB.id,
            conflictSubject: factA.subject,
            conflictPredicate: factA.predicate,
            factAValue: factA.value,
            factBValue: factB.value,
            severity,
            detectionType,
            explanation: `Fact ${factA.id} says ${factA.predicate}=${factA.value}; Fact ${factB.id} says ${factA.predicate}=${factB.value}`,
            provenance,
          }),
        );
        pairCount++;
      }
      if (pairCount >= MAX_PAIRS_PER_GROUP) break;
    }
  }

  return contradictions;
}

/**
 * Infer severity from the predicate and detection type.
 *
 * Confirmed + singular predicate (deadline, amount) → critical
 * Confirmed + other → major
 * Potential → major (needs review, not necessarily urgent)
 */
function inferSeverity(predicate: string, detectionType: DetectionType): ContradictionSeverity {
  if (detectionType === "potential") return "major";

  const criticalPredicates = [
    "has_deadline", "deadline", "response_deadline", "filing_deadline",
    "has_amount", "amount", "debt_amount", "payment_amount",
    "has_date", "filing_date", "hearing_date", "decision_date",
    "debt_owed", "eligibility",
  ];
  if (criticalPredicates.includes(predicate.toLowerCase())) {
    return "critical";
  }
  return "major";
}

// ── Sorting ────────────────────────────────────────────────────────────────────

export function sortBySeverity(contradictions: readonly Contradiction[]): Contradiction[] {
  return [...contradictions].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
}

export function sortByReviewStatus(contradictions: readonly Contradiction[]): Contradiction[] {
  const order: Record<ReviewStatus, number> = { unreviewed: 0, reviewed: 1, resolved: 2 };
  return [...contradictions].sort((a, b) => order[a.reviewStatus] - order[b.reviewStatus]);
}

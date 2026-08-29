/**
 * @mailmypdf/intelligence — Finding model.
 *
 * A Finding is a derived conclusion based on facts, evidence, contradictions,
 * and entities. It represents an interpretation, not raw data.
 *
 * Finding ≠ Fact: a fact asserts something; a finding derives a conclusion from facts.
 * Finding ≠ Evidence: evidence links claims to sources; a finding interprets evidence.
 * Finding ≠ Contradiction: a contradiction records a conflict; a finding may be
 *   weakened or motivated by that conflict.
 *
 * A Finding preserves its COMPLETE derivation chain:
 *   - factIds: which facts it was derived from
 *   - evidenceIds: which evidence supports it
 *   - contradictionIds: which contradictions affect it
 *   - entityIds: which entities it concerns
 *
 * AI may PROPOSE findings (provenance: ai_inferred) but must NOT establish them
 * as authoritative. Human review is required for verification.
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

// ═══════════════════════════════════════════════════════════════════════════════
// FINDING SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

export type FindingSeverity =
  | "critical"   // Directly affects case outcome (e.g., missed deadline)
  | "major"      // Needs resolution before proceeding (e.g., factual discrepancy)
  | "minor"      // Note for the record (e.g., missing reference)
  | "info";      // Informational observation (e.g., case strength)

export const ALL_FINDING_SEVERITIES: readonly FindingSeverity[] = [
  "critical",
  "major",
  "minor",
  "info",
] as const;

export const FINDING_SEVERITY_WEIGHT: Readonly<Record<FindingSeverity, number>> = {
  critical: 4,
  major: 3,
  minor: 2,
  info: 1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FINDING STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export type FindingStatus = "active" | "superseded" | "retracted";

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export const MAX_FINDING_TYPE_LENGTH = 100;
export const MAX_FINDING_EXPLANATION_LENGTH = 3000;
export const MAX_RECOMMENDED_ACTION_LENGTH = 1000;
export const MAX_DERIVATION_REFS = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// FINDING
// ═══════════════════════════════════════════════════════════════════════════════

export interface Finding extends IntelligenceObject {
  /** Finding type — open-ended string, verticals define their own */
  readonly findingType: string;
  /** Severity of the finding */
  readonly severity: FindingSeverity;
  /** Current status */
  readonly status: FindingStatus;
  /** Facts this finding was derived from */
  readonly factIds: readonly PlatformId[];
  /** Evidence supporting this finding */
  readonly evidenceIds: readonly PlatformId[];
  /** Contradictions affecting this finding */
  readonly contradictionIds: readonly PlatformId[];
  /** Entities this finding concerns */
  readonly entityIds: readonly PlatformId[];
  /** Human-readable explanation (length-limited, NOT authoritative) */
  readonly explanation?: string | undefined;
  /** Suggested next action */
  readonly recommendedAction?: string | undefined;
  /** If superseded, which finding replaced this one */
  readonly supersededBy?: PlatformId | undefined;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateFindingInput {
  id?: string;
  findingType: string;
  severity: FindingSeverity;
  factIds?: readonly string[];
  evidenceIds?: readonly string[];
  contradictionIds?: readonly string[];
  entityIds?: readonly string[];
  explanation?: string;
  recommendedAction?: string;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createFinding(input: CreateFindingInput): Finding {
  const typeCheck = validateNonEmpty(input.findingType, "findingType");
  if (!typeCheck.ok) throw typeCheck.error;

  const typeLen = validateMaxLength(input.findingType, "findingType", MAX_FINDING_TYPE_LENGTH);
  if (!typeLen.ok) throw typeLen.error;

  if (!ALL_FINDING_SEVERITIES.includes(input.severity)) {
    throw new Error(`Invalid finding severity: ${input.severity}`);
  }

  if (input.explanation !== undefined) {
    const explLen = validateMaxLength(input.explanation, "explanation", MAX_FINDING_EXPLANATION_LENGTH);
    if (!explLen.ok) throw explLen.error;
  }

  if (input.recommendedAction !== undefined) {
    const actLen = validateMaxLength(input.recommendedAction, "recommendedAction", MAX_RECOMMENDED_ACTION_LENGTH);
    if (!actLen.ok) throw actLen.error;
  }

  // Limit derivation references to prevent resource exhaustion
  if (input.factIds && input.factIds.length > MAX_DERIVATION_REFS) {
    throw new Error(`Finding factIds exceeds ${MAX_DERIVATION_REFS} references`);
  }
  if (input.evidenceIds && input.evidenceIds.length > MAX_DERIVATION_REFS) {
    throw new Error(`Finding evidenceIds exceeds ${MAX_DERIVATION_REFS} references`);
  }
  if (input.contradictionIds && input.contradictionIds.length > MAX_DERIVATION_REFS) {
    throw new Error(`Finding contradictionIds exceeds ${MAX_DERIVATION_REFS} references`);
  }
  if (input.entityIds && input.entityIds.length > MAX_DERIVATION_REFS) {
    throw new Error(`Finding entityIds exceeds ${MAX_DERIVATION_REFS} references`);
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.6);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    findingType: input.findingType,
    severity: input.severity,
    status: "active",
    factIds: (input.factIds ?? []).map(createId),
    evidenceIds: (input.evidenceIds ?? []).map(createId),
    contradictionIds: (input.contradictionIds ?? []).map(createId),
    entityIds: (input.entityIds ?? []).map(createId),
    explanation: input.explanation,
    recommendedAction: input.recommendedAction,
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Verification ──────────────────────────────────────────────────────────────

export function verifyFinding(finding: Finding, verifiedBy: string): Finding {
  return {
    ...finding,
    provenance: verifyProvenance(finding.provenance, verifiedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Supersession ──────────────────────────────────────────────────────────────

export function supersedeFinding(old: Finding, replacement: Finding): { old: Finding; updated: Finding } {
  if (old.findingType !== replacement.findingType) {
    throw new Error("Cannot supersede a finding with a different finding type");
  }
  return {
    old: {
      ...old,
      status: "superseded" as FindingStatus,
      supersededBy: replacement.id,
      updatedAt: new Date().toISOString(),
    },
    updated: replacement,
  };
}

// ── Retraction ────────────────────────────────────────────────────────────────

export function retractFinding(finding: Finding): Finding {
  return { ...finding, status: "retracted" as FindingStatus, updatedAt: new Date().toISOString() };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateFinding(f: Finding): Result<void, ValidationError> {
  if (!f.findingType || f.findingType.trim().length === 0) {
    return err(new ValidationError("Finding findingType must not be empty"));
  }
  if (f.findingType.length > MAX_FINDING_TYPE_LENGTH) {
    return err(new ValidationError(`Finding findingType exceeds ${MAX_FINDING_TYPE_LENGTH} chars`));
  }
  if (!ALL_FINDING_SEVERITIES.includes(f.severity)) {
    return err(new ValidationError(`Invalid finding severity: ${f.severity}`));
  }
  if (f.explanation !== undefined && f.explanation.length > MAX_FINDING_EXPLANATION_LENGTH) {
    return err(new ValidationError(`Finding explanation exceeds ${MAX_FINDING_EXPLANATION_LENGTH} chars`));
  }
  if (f.recommendedAction !== undefined && f.recommendedAction.length > MAX_RECOMMENDED_ACTION_LENGTH) {
    return err(new ValidationError(`Finding recommendedAction exceeds ${MAX_RECOMMENDED_ACTION_LENGTH} chars`));
  }
  if (f.factIds.length > MAX_DERIVATION_REFS) {
    return err(new ValidationError(`Finding factIds exceeds ${MAX_DERIVATION_REFS} references`));
  }
  if (f.evidenceIds.length > MAX_DERIVATION_REFS) {
    return err(new ValidationError(`Finding evidenceIds exceeds ${MAX_DERIVATION_REFS} references`));
  }
  if (f.contradictionIds.length > MAX_DERIVATION_REFS) {
    return err(new ValidationError(`Finding contradictionIds exceeds ${MAX_DERIVATION_REFS} references`));
  }
  if (f.entityIds.length > MAX_DERIVATION_REFS) {
    return err(new ValidationError(`Finding entityIds exceeds ${MAX_DERIVATION_REFS} references`));
  }
  return ok(undefined);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function isFindingActive(f: Finding): boolean { return f.status === "active"; }
export function isFindingSuperseded(f: Finding): boolean { return f.status === "superseded"; }
export function isFindingRetracted(f: Finding): boolean { return f.status === "retracted"; }
export function isFindingCritical(f: Finding): boolean { return f.severity === "critical"; }
export function isFindingMajor(f: Finding): boolean { return f.severity === "major"; }
export function isFindingMinor(f: Finding): boolean { return f.severity === "minor"; }
export function isFindingInfo(f: Finding): boolean { return f.severity === "info"; }

export function findingsForEntity(findings: readonly Finding[], entityId: PlatformId): Finding[] {
  return findings.filter((f) => f.status === "active" && f.entityIds.includes(entityId));
}

export function findingsForFact(findings: readonly Finding[], factId: PlatformId): Finding[] {
  return findings.filter((f) => f.status === "active" && f.factIds.includes(factId));
}

export function criticalFindings(findings: readonly Finding[]): Finding[] {
  return findings.filter((f) => f.severity === "critical" && f.status === "active");
}

export function unresolvedFindings(findings: readonly Finding[]): Finding[] {
  return findings.filter((f) => f.status === "active" && !f.verified);
}

// ── Sorting ──────────────────────────────────────────────────────────────────

export function sortFindingsBySeverity(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => FINDING_SEVERITY_WEIGHT[b.severity] - FINDING_SEVERITY_WEIGHT[a.severity]);
}

export function sortFindingsByConfidence(findings: readonly Finding[]): Finding[] {
  return [...findings].sort((a, b) => b.confidence - a.confidence);
}

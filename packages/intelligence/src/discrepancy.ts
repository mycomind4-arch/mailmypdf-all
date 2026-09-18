import {
  confidence as makeConfidence,
  createId,
  type Confidence,
  type PlatformId,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import {
  createProvenance,
  verifyProvenance,
  type IntelligenceObject,
  type ProvenanceLevel,
} from "./provenance.js";

export type DiscrepancySeverity = "high" | "medium" | "low";
export type DiscrepancyReviewState =
  | "pending"
  | "reviewed"
  | "resolved"
  | "ignored";

export interface Discrepancy extends IntelligenceObject {
  readonly discrepancyType: string;
  readonly severity: DiscrepancySeverity;
  readonly rationale: string;
  readonly evidenceRefs: readonly PlatformId[];
  readonly sourceRefs: readonly SourceRef[];
  readonly involvesHighConsequence: boolean;
  readonly reviewState: DiscrepancyReviewState;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
  readonly resolutionNote?: string;
}

export interface CreateDiscrepancyInput {
  id?: string;
  discrepancyType: string;
  severity: DiscrepancySeverity;
  rationale: string;
  evidenceRefs?: readonly string[];
  sourceRefs?: readonly SourceRef[];
  involvesHighConsequence?: boolean;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export interface DiscrepancyReport {
  readonly discrepancies: readonly Discrepancy[];
  readonly highSeverityCount: number;
  readonly mediumSeverityCount: number;
  readonly lowSeverityCount: number;
  readonly unresolvedCount: number;
  readonly blockingCount: number;
  readonly requiresHumanReview: boolean;
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Discrepancy requires ${label}`);
  return normalized;
}

/**
 * Generic discrepancy primitive migrated from the legacy Code Enforcement
 * discrepancy engine. Domain packs still own detection rules; this shared
 * model owns the durable record, provenance, review state, and reporting
 * semantics.
 */
export function createDiscrepancy(input: CreateDiscrepancyInput): Discrepancy {
  const now = new Date().toISOString();
  const provenance = createProvenance(input.provenance);
  return {
    id: createId(input.id ?? crypto.randomUUID()),
    discrepancyType: requireText(input.discrepancyType, "discrepancyType"),
    severity: input.severity,
    rationale: requireText(input.rationale, "rationale"),
    evidenceRefs: (input.evidenceRefs ?? []).map(createId),
    sourceRefs: [...(input.sourceRefs ?? input.provenance.sourceRefs ?? [])],
    involvesHighConsequence: input.involvesHighConsequence ?? false,
    reviewState: "pending",
    provenance,
    confidence: makeConfidence(input.confidence ?? 0.5),
    verified: provenance.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

export function reviewDiscrepancy(
  discrepancy: Discrepancy,
  input: {
    reviewedBy: string;
    state: Exclude<DiscrepancyReviewState, "pending">;
    note?: string;
    reviewedAt?: string;
  },
): Discrepancy {
  const reviewedBy = requireText(input.reviewedBy, "reviewedBy");
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(reviewedAt))) {
    throw new Error("Discrepancy reviewedAt must be a valid date");
  }

  const provenance =
    input.state === "resolved"
      ? verifyProvenance(discrepancy.provenance, reviewedBy)
      : discrepancy.provenance;

  return {
    ...discrepancy,
    reviewState: input.state,
    reviewedBy,
    reviewedAt,
    resolutionNote: input.note?.trim() || undefined,
    provenance,
    verified: input.state === "resolved" ? true : discrepancy.verified,
    updatedAt: reviewedAt,
  };
}

export function unresolvedDiscrepancies(
  discrepancies: readonly Discrepancy[],
): Discrepancy[] {
  return discrepancies.filter(
    (discrepancy) =>
      discrepancy.reviewState === "pending" ||
      discrepancy.reviewState === "reviewed",
  );
}

export function buildDiscrepancyReport(
  discrepancies: readonly Discrepancy[],
): DiscrepancyReport {
  const unresolved = unresolvedDiscrepancies(discrepancies);
  return {
    discrepancies: [...discrepancies],
    highSeverityCount: discrepancies.filter((item) => item.severity === "high").length,
    mediumSeverityCount: discrepancies.filter((item) => item.severity === "medium").length,
    lowSeverityCount: discrepancies.filter((item) => item.severity === "low").length,
    unresolvedCount: unresolved.length,
    blockingCount: unresolved.filter(
      (item) => item.involvesHighConsequence || item.severity === "high",
    ).length,
    requiresHumanReview: unresolved.some(
      (item) => item.involvesHighConsequence || item.severity === "high",
    ),
  };
}

export function discrepanciesByType(
  discrepancies: readonly Discrepancy[],
  discrepancyType: string,
): Discrepancy[] {
  return discrepancies.filter(
    (item) => item.discrepancyType === discrepancyType,
  );
}

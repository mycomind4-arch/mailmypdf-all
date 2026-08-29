/**
 * @mailmypdf/intelligence — Provenance types and utilities.
 *
 * Provenance is the first-class origin tracking system for all intelligence objects.
 * Every fact, evidence item, finding, and relationship records WHERE it came from
 * and HOW it was obtained.
 *
 * ProvenanceLevel is NEVER collapsed into a confidence score. They are independent:
 * - Provenance = WHERE it came from
 * - Confidence = HOW SURE we are
 * - Verified = WHETHER a human confirmed it
 */

import type { Confidence, PlatformId } from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE LEVEL
// ═══════════════════════════════════════════════════════════════════════════════

export type ProvenanceLevel =
  | "user_provided"      // Entered directly by the user
  | "document_extracted" // Extracted from a document via deterministic parsing
  | "external_source"    // From an external API or database
  | "rule_derived"       // Computed by a business rule (e.g., deadline = decision + 30 days)
  | "ai_inferred"        // Produced by an AI/LLM model
  | "human_verified";    // User confirmed a previously extracted/inferred value

export const ALL_PROVENANCE_LEVELS: readonly ProvenanceLevel[] = [
  "user_provided",
  "document_extracted",
  "external_source",
  "rule_derived",
  "ai_inferred",
  "human_verified",
] as const;

/**
 * Provenance strength ordering — higher is more trustworthy.
 * Used for conflict resolution when two sources disagree.
 */
export const PROVENANCE_STRENGTH: Readonly<Record<ProvenanceLevel, number>> = {
  human_verified: 5,      // Highest — human confirmed
  document_extracted: 4,  // High — directly from a document
  external_source: 3,     // Medium — from a trusted external source
  rule_derived: 3,        // Medium — computed from rules
  user_provided: 2,       // Lower — user entered, not verified
  ai_inferred: 1,         // Lowest — AI suggestion, needs verification
} as const;

/**
 * Can a given provenance level be automatically verified?
 * Only human_verified and document_extracted are considered trustworthy.
 */
export function isAutoTrusted(level: ProvenanceLevel): boolean {
  return level === "human_verified" || level === "document_extracted";
}

/**
 * Can AI output at this provenance level be shown to users without disclaimers?
 * Only if human_verified or document_extracted.
 */
export function canPresentWithoutDisclaimer(level: ProvenanceLevel): boolean {
  return level === "human_verified" || level === "document_extracted";
}

/**
 * Resolve conflicting provenance — return the more trustworthy level.
 */
export function strongerProvenance(a: ProvenanceLevel, b: ProvenanceLevel): ProvenanceLevel {
  return PROVENANCE_STRENGTH[a] >= PROVENANCE_STRENGTH[b] ? a : b;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE RECORD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ProvenanceRecord is attached to every intelligence object.
 * It records the full chain of origin for auditability.
 */
export interface ProvenanceRecord {
  /** How this information was obtained */
  readonly level: ProvenanceLevel;
  /** Source documents that support this information */
  readonly sourceRefs: readonly SourceRef[];
  /** When this information was recorded */
  readonly recordedAt: string;
  /** If AI-inferred, which model produced it */
  readonly modelId?: string | undefined;
  /** If human-verified, who verified it */
  readonly verifiedBy?: string | undefined;
  /** If rule-derived, which rule produced it */
  readonly ruleId?: string | undefined;
}

export function createProvenance(input: {
  level: ProvenanceLevel;
  sourceRefs?: readonly SourceRef[];
  modelId?: string;
  verifiedBy?: string;
  ruleId?: string;
}): ProvenanceRecord {
  if (input.level === "ai_inferred" && !input.modelId) {
    throw new Error("AI-inferred provenance requires a modelId");
  }
  if (input.level === "human_verified" && !input.verifiedBy) {
    throw new Error("Human-verified provenance requires a verifiedBy");
  }
  if (input.level === "rule_derived" && !input.ruleId) {
    throw new Error("Rule-derived provenance requires a ruleId");
  }
  return {
    level: input.level,
    sourceRefs: input.sourceRefs ?? [],
    recordedAt: new Date().toISOString(),
    modelId: input.modelId,
    verifiedBy: input.verifiedBy,
    ruleId: input.ruleId,
  };
}

/**
 * Upgrade provenance to human_verified.
 * This is the ONLY way to promote an object to verified status.
 */
export function verifyProvenance(
  provenance: ProvenanceRecord,
  verifiedBy: string,
): ProvenanceRecord {
  return {
    ...provenance,
    level: "human_verified",
    verifiedBy,
    recordedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE OBJECT BASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Every intelligence object has these base fields.
 * This is the foundation of the provenance-first design.
 */
export interface IntelligenceObject {
  readonly id: PlatformId;
  readonly provenance: ProvenanceRecord;
  readonly confidence: Confidence;
  readonly verified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Re-export SourceRef for convenience
export type { SourceRef } from "@mailmypdf/documents";
export type { Confidence, PlatformId } from "@mailmypdf/core";

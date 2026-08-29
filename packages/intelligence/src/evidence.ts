/**
 * @mailmypdf/intelligence — Evidence model.
 *
 * Evidence links a claim (Fact) to supporting or contradicting material
 * with full provenance. This is the core value proposition of the
 * intelligence graph: every claim can be traced to its evidence.
 *
 * SOURCE     → where information came from (Document, SourceRef)
 * FACT       → a claim with subject + predicate + value
 * EVIDENCE   → the link between a claim and its supporting/contradicting source
 * EVALUATION → a deterministic assessment of evidence quality and corroboration
 *
 * These four concepts are distinct. Evidence is NOT a Fact (it doesn't
 * assert anything). Evidence is NOT a Relationship (it's a specialized
 * link with evaluation semantics). Evidence is NOT a SourceRef (it
 * wraps source references with a relation to a claim).
 *
 * EvidenceItem:  claim (Fact) + evidence source + relation + confidence + provenance
 * EvidencePacket: collection of evidence items for a single claim
 * Evaluation:    deterministic assessment of evidence quality, NOT a truth score
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
import type { ProvenanceLevel, ProvenanceRecord } from "./provenance.js";
import { createProvenance, verifyProvenance } from "./provenance.js";
import type { IntelligenceObject } from "./provenance.js";

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE RELATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * How a piece of evidence relates to a claim.
 */
export type EvidenceRelation =
  | "supports"       // Evidence directly supports the claim
  | "contradicts"    // Evidence directly contradicts the claim
  | "qualifies"      // Evidence partially supports or adds nuance
  | "missing";       // Expected evidence is absent (gap, not evidence)

export const ALL_EVIDENCE_RELATIONS: readonly EvidenceRelation[] = [
  "supports",
  "contradicts",
  "qualifies",
  "missing",
] as const;

function isValidRelation(r: string): r is EvidenceRelation {
  return (ALL_EVIDENCE_RELATIONS as readonly string[]).includes(r);
}

/**
 * Relation strength for evaluation:
 *   supports    → +1.0 (strong positive)
 *   contradicts → -1.0 (strong negative)
 *   qualifies   → +0.5 (moderate positive, adds nuance)
 *   missing     →  0.0 (neutral — a gap, not evidence)
 */
export const RELATION_STRENGTH: Readonly<Record<EvidenceRelation, number>> = {
  supports: 1.0,
  contradicts: -1.0,
  qualifies: 0.5,
  missing: 0.0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Provenance weight for evidence evaluation.
 *
 * These weights reflect how much we TRUST the source of an evidence item,
 * NOT whether the claim is true. Higher provenance = more weight in the
 * evaluation because the evidence source is more reliable.
 *
 *   human_verified:   1.0  — a human confirmed this evidence
 *   document_extracted: 0.9 — extracted from a document via deterministic parsing
 *   external_source:  0.7  — from a trusted external API or database
 *   rule_derived:     0.7  — computed by a business rule
 *   user_provided:    0.5  — entered by a user, not independently verified
 *   ai_inferred:      0.3  — AI/LLM suggestion, inherently untrusted
 *
 * These weights are EXPORTED so consumers can understand and audit the
 * evaluation logic. They are deterministic constants, not learned.
 */
export const PROVENANCE_WEIGHT: Readonly<Record<ProvenanceLevel, number>> = {
  human_verified: 1.0,
  document_extracted: 0.9,
  external_source: 0.7,
  rule_derived: 0.7,
  user_provided: 0.5,
  ai_inferred: 0.3,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE ITEM
// ═══════════════════════════════════════════════════════════════════════════════

export type EvidenceStatus = "active" | "retracted" | "superseded";

/**
 * A single piece of evidence linking a claim to a source.
 *
 * The claim is identified by a Fact ID (claimId).
 * The source is identified by evidenceType + evidenceId (what the evidence IS).
 * Source references (where we learned about this evidence) live in provenance.sourceRefs.
 *
 * This does NOT duplicate:
 *   - Fact: Evidence doesn't assert anything; it links a fact to a source
 *   - Relationship: Evidence has evaluation semantics (supports/contradicts/qualifies)
 *   - SourceRef: Source refs live in provenance, not duplicated at top level
 */
export interface EvidenceItem extends IntelligenceObject {
  /** The fact this evidence supports/contradicts */
  readonly claimId: PlatformId;
  /** How this evidence relates to the claim */
  readonly relation: EvidenceRelation;
  /** What kind of thing the evidence IS */
  readonly evidenceType: "document" | "fact" | "entity" | "external";
  /** ID of the evidence object (document ID, fact ID, entity ID, or external URL) */
  readonly evidenceId: string;
  /** Optional human-readable explanation of why this is evidence */
  readonly explanation?: string | undefined;
  readonly status: EvidenceStatus;
  /** If superseded, which evidence item replaced this one */
  readonly supersededBy?: PlatformId | undefined;
}

export const MAX_EXPLANATION_LENGTH = 2000;
export const MAX_EVIDENCE_ID_LENGTH = 200;

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateEvidenceInput {
  id?: string;
  claimId: string;
  relation: EvidenceRelation;
  evidenceType: "document" | "fact" | "entity" | "external";
  evidenceId: string;
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

export function createEvidence(input: CreateEvidenceInput): EvidenceItem {
  const claimCheck = validateNonEmpty(input.claimId, "claimId");
  if (!claimCheck.ok) throw claimCheck.error;

  const evidenceIdCheck = validateNonEmpty(input.evidenceId, "evidenceId");
  if (!evidenceIdCheck.ok) throw evidenceIdCheck.error;

  const evidenceIdLen = validateMaxLength(input.evidenceId, "evidenceId", MAX_EVIDENCE_ID_LENGTH);
  if (!evidenceIdLen.ok) throw evidenceIdLen.error;

  if (input.explanation !== undefined) {
    const explLen = validateMaxLength(input.explanation, "explanation", MAX_EXPLANATION_LENGTH);
    if (!explLen.ok) throw explLen.error;
  }

  if (!isValidRelation(input.relation)) {
    throw new Error(`Invalid evidence relation: ${input.relation}`);
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.5);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    claimId: createId(input.claimId),
    relation: input.relation,
    evidenceType: input.evidenceType,
    evidenceId: input.evidenceId,
    explanation: input.explanation,
    status: "active",
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Verification ──────────────────────────────────────────────────────────────

export function verifyEvidence(evidence: EvidenceItem, verifiedBy: string): EvidenceItem {
  return {
    ...evidence,
    provenance: verifyProvenance(evidence.provenance, verifiedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Retraction ────────────────────────────────────────────────────────────────

export function retractEvidence(evidence: EvidenceItem): EvidenceItem {
  return { ...evidence, status: "retracted" as EvidenceStatus, updatedAt: new Date().toISOString() };
}

// ── Supersession ──────────────────────────────────────────────────────────────

export function supersedeEvidence(old: EvidenceItem, replacement: EvidenceItem): { old: EvidenceItem; updated: EvidenceItem } {
  if (old.claimId !== replacement.claimId) {
    throw new Error("Cannot supersede evidence for a different claim");
  }
  return {
    old: {
      ...old,
      status: "superseded" as EvidenceStatus,
      supersededBy: replacement.id,
      updatedAt: new Date().toISOString(),
    },
    updated: replacement,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateEvidence(evidence: EvidenceItem): Result<void, ValidationError> {
  if (!evidence.claimId || evidence.claimId.trim().length === 0) {
    return err(new ValidationError("Evidence claimId must not be empty"));
  }
  if (!evidence.evidenceId || evidence.evidenceId.trim().length === 0) {
    return err(new ValidationError("Evidence evidenceId must not be empty"));
  }
  if (evidence.evidenceId.length > MAX_EVIDENCE_ID_LENGTH) {
    return err(new ValidationError(`Evidence evidenceId exceeds ${MAX_EVIDENCE_ID_LENGTH} chars`));
  }
  if (!isValidRelation(evidence.relation)) {
    return err(new ValidationError(`Invalid evidence relation: ${evidence.relation}`));
  }
  if (evidence.explanation !== undefined && evidence.explanation.length > MAX_EXPLANATION_LENGTH) {
    return err(new ValidationError(`Evidence explanation exceeds ${MAX_EXPLANATION_LENGTH} chars`));
  }
  if (evidence.confidence < 0 || evidence.confidence > 1) {
    return err(new ValidationError("Evidence confidence must be between 0 and 1"));
  }
  return ok(undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE PACKET
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum items in a single evidence packet.
 * Prevents resource exhaustion from pathological inputs.
 */
export const MAX_EVIDENCE_ITEMS = 500;

/**
 * A collection of evidence items for a single claim.
 *
 * EvidencePacket is useful because:
 * 1. It enforces that all items are for the same claim (structural invariant)
 * 2. It provides typed query functions (supporting, contradicting, etc.)
 * 3. It is the input to evaluateEvidence — the unit of evaluation
 *
 * Without EvidencePacket, consumers would pass raw arrays to evaluateEvidence,
 * risking accidental mixing of evidence for different claims.
 */
export interface EvidencePacket {
  readonly claimId: PlatformId;
  readonly items: readonly EvidenceItem[];
}

export function createEvidencePacket(claimId: string, items: readonly EvidenceItem[]): EvidencePacket {
  const idCheck = validateNonEmpty(claimId, "claimId");
  if (!idCheck.ok) throw idCheck.error;

  if (items.length > MAX_EVIDENCE_ITEMS) {
    throw new Error(`Evidence packet exceeds ${MAX_EVIDENCE_ITEMS} items (got ${items.length})`);
  }

  // All items must be for the same claim
  for (const item of items) {
    if (item.claimId !== claimId) {
      throw new Error(`Evidence item ${item.id} is for claim ${item.claimId}, not ${claimId}`);
    }
  }

  return {
    claimId: createId(claimId),
    items,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function activeItems(packet: EvidencePacket): EvidenceItem[] {
  return packet.items.filter((i) => i.status === "active");
}

export function supportingItems(packet: EvidencePacket): EvidenceItem[] {
  return activeItems(packet).filter((i) => i.relation === "supports");
}

export function contradictingItems(packet: EvidencePacket): EvidenceItem[] {
  return activeItems(packet).filter((i) => i.relation === "contradicts");
}

export function qualifyingItems(packet: EvidencePacket): EvidenceItem[] {
  return activeItems(packet).filter((i) => i.relation === "qualifies");
}

export function missingItems(packet: EvidencePacket): EvidenceItem[] {
  return activeItems(packet).filter((i) => i.relation === "missing");
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvidenceEvaluation {
  /**
   * Net support score: sum of (relationStrength × confidence × provenanceWeight)
   * for all active items. Positive = evidence leans supportive,
   * negative = evidence leans contradictory.
   *
   * THIS IS NOT A TRUTH SCORE. It does not claim the fact is true or false.
   * It measures the quality and direction of available evidence.
   * A high score means "we have strong, well-sourced evidence supporting this claim."
   * A low score means "evidence is weak, contradictory, or missing."
   * An absence of evidence produces a score of 0, NOT a claim that the fact is false.
   */
  readonly netSupport: number;
  /**
   * Normalized support strength on a 0-1 scale.
   * 0 = no evidence or net contradictory, 1 = all evidence supports.
   * This is netSupport divided by total absolute weight, so it
   * represents the DIRECTION of evidence quality, not magnitude.
   */
  readonly supportStrength: number;
  /** Number of supporting items */
  readonly supportingCount: number;
  /** Number of contradicting items */
  readonly contradictingCount: number;
  /** Number of qualifying items */
  readonly qualifyingCount: number;
  /** Number of missing evidence items (gaps) */
  readonly missingCount: number;
  /** Is the claim supported? (netSupport > 0 and no unaddressed contradictions) */
  readonly isSupported: boolean;
  /** Is the claim contradicted? (netSupport < 0) */
  readonly isContradicted: boolean;
  /** Are there unaddressed gaps? */
  readonly hasGaps: boolean;
  /**
   * Overall evidence quality: average (confidence × provenanceWeight) across items.
   * This tells you HOW WELL-SOURCED the evidence is, not whether the claim is true.
   * High confidence = evidence comes from reliable, high-confidence sources.
   * Low confidence = evidence is from AI guesses or unverified user input.
   */
  readonly evidenceQuality: number;
}

/**
 * Evaluate an evidence packet.
 *
 * The evaluation is DETERMINISTIC and EXPLAINABLE:
 *   netSupport = Σ (relationStrength × confidence × provenanceWeight)
 *
 * Every component of the score is traceable:
 *   - relationStrength: RELATION_STRENGTH constant (supports=+1, contradicts=-1, ...)
 *   - confidence: the evidence item's own confidence (0-1)
 *   - provenanceWeight: PROVENANCE_WEIGHT constant (human_verified=1.0, ai_inferred=0.3, ...)
 *
 * The score does NOT claim to establish truth. It communicates:
 *   - How much evidence exists
 *   - What direction it points (support/contradict)
 *   - How well-sourced it is (provenance quality)
 *   - Whether gaps exist
 *
 * A human or downstream system must make the final judgment.
 */
export function evaluateEvidence(packet: EvidencePacket): EvidenceEvaluation {
  const items = activeItems(packet);
  if (items.length === 0) {
    return {
      netSupport: 0,
      supportStrength: 0,
      supportingCount: 0,
      contradictingCount: 0,
      qualifyingCount: 0,
      missingCount: 0,
      isSupported: false,
      isContradicted: false,
      hasGaps: false,
      evidenceQuality: 0,
    };
  }

  let netSupport = 0;
  let totalWeight = 0;
  let qualitySum = 0;
  let supportingCount = 0;
  let contradictingCount = 0;
  let qualifyingCount = 0;
  let missingCount = 0;

  for (const item of items) {
    const relStrength = RELATION_STRENGTH[item.relation];
    const provWeight = PROVENANCE_WEIGHT[item.provenance.level] ?? 0.3;
    const weight = item.confidence * provWeight;

    netSupport += relStrength * weight;
    totalWeight += Math.abs(weight);
    qualitySum += weight;

    switch (item.relation) {
      case "supports": supportingCount++; break;
      case "contradicts": contradictingCount++; break;
      case "qualifies": qualifyingCount++; break;
      case "missing": missingCount++; break;
    }
  }

  const supportStrength = totalWeight > 0
    ? Math.max(0, netSupport / totalWeight)
    : 0;

  return {
    netSupport: Math.round(netSupport * 1000) / 1000,
    supportStrength: Math.round(supportStrength * 1000) / 1000,
    supportingCount,
    contradictingCount,
    qualifyingCount,
    missingCount,
    isSupported: netSupport > 0 && contradictingCount === 0,
    isContradicted: netSupport < 0,
    hasGaps: missingCount > 0,
    evidenceQuality: Math.round((qualitySum / items.length) * 1000) / 1000,
  };
}

// ── Packet-level queries ─────────────────────────────────────────────────────

/**
 * Collect all evidence items for a specific claim from a larger set.
 * Returns a packet containing only active items for that claim.
 */
export function evidenceForClaim(allEvidence: readonly EvidenceItem[], claimId: PlatformId): EvidencePacket {
  const items = allEvidence.filter((e) => e.claimId === claimId && e.status === "active");
  return createEvidencePacket(claimId, items);
}

export function hasContradictions(packet: EvidencePacket): boolean {
  return contradictingItems(packet).length > 0;
}

export function hasGaps(packet: EvidencePacket): boolean {
  return missingItems(packet).length > 0;
}

// ── Duplicate Detection ───────────────────────────────────────────────────────

/**
 * Two evidence items are duplicates if they reference the same claim,
 * same evidence source, and same relation.
 */
export function isDuplicateEvidence(a: EvidenceItem, b: EvidenceItem): boolean {
  return (
    a.claimId === b.claimId &&
    a.evidenceType === b.evidenceType &&
    a.evidenceId === b.evidenceId &&
    a.relation === b.relation
  );
}

/**
 * Remove duplicate evidence items, keeping the one with stronger provenance.
 */
export function deduplicateEvidence(items: readonly EvidenceItem[]): EvidenceItem[] {
  const seen = new Map<string, EvidenceItem>();
  for (const item of items) {
    if (item.status !== "active") continue;
    const key = `${item.claimId}|${item.evidenceType}|${item.evidenceId}|${item.relation}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
    } else {
      const existingWeight = PROVENANCE_WEIGHT[existing.provenance.level] ?? 0.3;
      const newWeight = PROVENANCE_WEIGHT[item.provenance.level] ?? 0.3;
      if (newWeight > existingWeight) {
        seen.set(key, item);
      }
    }
  }
  return [...seen.values()];
}

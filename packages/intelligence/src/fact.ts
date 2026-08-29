/**
 * @mailmypdf/intelligence — Fact model.
 *
 * A Fact is a single piece of information with full provenance:
 *
 *   SUBJECT + PREDICATE + VALUE + PROVENANCE
 *
 * Example:
 *   subject:   entity_123 (person)
 *   predicate: "has_deadline"
 *   value:     "2026-09-15"
 *   provenance: document_456/page_2
 *
 * Facts are append-oriented. When a fact changes, the old fact is
 * preserved and a new fact is created. The relationship between
 * old and new facts is tracked via the Relationship model.
 */

import {
  type Confidence,
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
// FACT
// ═══════════════════════════════════════════════════════════════════════════════

export type FactStatus = "active" | "superseded" | "retracted" | "disputed";

export interface Fact extends IntelligenceObject {
  /** The entity or thing this fact is about (a PlatformId or a plain string label) */
  readonly subject: string;
  /** What the fact says about the subject (e.g., "has_deadline", "lives_at") */
  readonly predicate: string;
  /** The value of the fact (e.g., "2026-09-15", "123 Main Street") */
  readonly value: string;
  /** Current status of this fact */
  readonly status: FactStatus;
  /** If superseded, which fact replaced this one */
  readonly supersededBy?: PlatformId | undefined;
  /** If disputed, which fact conflicts with this one */
  readonly disputedBy?: readonly PlatformId[] | undefined;
}

export const MAX_SUBJECT_LENGTH = 200;
export const MAX_PREDICATE_LENGTH = 100;
export const MAX_VALUE_LENGTH = 2000;

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateFactInput {
  id?: string;
  subject: string;
  predicate: string;
  value: string;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createFact(input: CreateFactInput): Fact {
  const subjectCheck = validateNonEmpty(input.subject, "subject");
  if (!subjectCheck.ok) throw subjectCheck.error;

  const subjectLen = validateMaxLength(input.subject, "subject", MAX_SUBJECT_LENGTH);
  if (!subjectLen.ok) throw subjectLen.error;

  const predicateCheck = validateNonEmpty(input.predicate, "predicate");
  if (!predicateCheck.ok) throw predicateCheck.error;

  const predicateLen = validateMaxLength(input.predicate, "predicate", MAX_PREDICATE_LENGTH);
  if (!predicateLen.ok) throw predicateLen.error;

  const valueCheck = validateNonEmpty(input.value, "value");
  if (!valueCheck.ok) throw valueCheck.error;

  const valueLen = validateMaxLength(input.value, "value", MAX_VALUE_LENGTH);
  if (!valueLen.ok) throw valueLen.error;

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.5);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    subject: input.subject,
    predicate: input.predicate,
    value: input.value,
    status: "active",
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Verification ──────────────────────────────────────────────────────────────

export function verifyFact(fact: Fact, verifiedBy: string): Fact {
  return {
    ...fact,
    provenance: verifyProvenance(fact.provenance, verifiedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Supersession (append-only history) ────────────────────────────────────────

/**
 * Supersede an old fact with a new fact.
 * The old fact is NOT deleted — it is marked as superseded.
 * This preserves the full history for audit and conflict tracking.
 */
export function supersedeFact(oldFact: Fact, newFact: Fact): { old: Fact; updated: Fact } {
  if (oldFact.subject !== newFact.subject || oldFact.predicate !== newFact.predicate) {
    throw new Error("Cannot supersede a fact with a different subject/predicate");
  }
  return {
    old: {
      ...oldFact,
      status: "superseded" as FactStatus,
      supersededBy: newFact.id,
      updatedAt: new Date().toISOString(),
    },
    updated: newFact,
  };
}

// ── Dispute ───────────────────────────────────────────────────────────────────

/**
 * Mark a fact as disputed by another fact.
 * Both facts are preserved — neither is destroyed.
 */
export function disputeFact(fact: Fact, disputingFactId: PlatformId): Fact {
  const existing = fact.disputedBy ?? [];
  if (existing.includes(disputingFactId)) return fact;
  return {
    ...fact,
    status: "disputed" as FactStatus,
    disputedBy: [...existing, disputingFactId],
    updatedAt: new Date().toISOString(),
  };
}

// ── Retraction ────────────────────────────────────────────────────────────────

/**
 * Retract a fact (e.g., if it was extracted in error).
 * The fact is preserved for audit, just marked as retracted.
 */
export function retractFact(fact: Fact): Fact {
  return { ...fact, status: "retracted" as FactStatus, updatedAt: new Date().toISOString() };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateFact(fact: Fact): Result<void, ValidationError> {
  if (!fact.subject || fact.subject.trim().length === 0) {
    return err(new ValidationError("Fact subject must not be empty"));
  }
  if (fact.subject.length > MAX_SUBJECT_LENGTH) {
    return err(new ValidationError(`Fact subject exceeds ${MAX_SUBJECT_LENGTH} chars`));
  }
  if (!fact.predicate || fact.predicate.trim().length === 0) {
    return err(new ValidationError("Fact predicate must not be empty"));
  }
  if (fact.predicate.length > MAX_PREDICATE_LENGTH) {
    return err(new ValidationError(`Fact predicate exceeds ${MAX_PREDICATE_LENGTH} chars`));
  }
  if (!fact.value || fact.value.trim().length === 0) {
    return err(new ValidationError("Fact value must not be empty"));
  }
  if (fact.value.length > MAX_VALUE_LENGTH) {
    return err(new ValidationError(`Fact value exceeds ${MAX_VALUE_LENGTH} chars`));
  }
  return ok(undefined);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function isFactActive(fact: Fact): boolean {
  return fact.status === "active";
}

export function isFactSuperseded(fact: Fact): boolean {
  return fact.status === "superseded";
}

export function isFactDisputed(fact: Fact): boolean {
  return fact.status === "disputed";
}

export function isFactRetracted(fact: Fact): boolean {
  return fact.status === "retracted";
}

export function factsBySubject(facts: readonly Fact[], subject: string): Fact[] {
  return facts.filter((f) => f.subject === subject && f.status === "active");
}

export function factsByPredicate(facts: readonly Fact[], predicate: string): Fact[] {
  return facts.filter((f) => f.predicate === predicate && f.status === "active");
}

/**
 * Find all facts with the same subject and predicate but different values.
 * These are potential contradictions.
 */
export function findConflictingFacts(facts: readonly Fact[]): readonly Fact[] {
  const active = facts.filter(isFactActive);
  const groups = new Map<string, Fact[]>();
  for (const f of active) {
    const key = `${f.subject}|${f.predicate}`;
    const group = groups.get(key) ?? [];
    group.push(f);
    groups.set(key, group);
  }
  const conflicts: Fact[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const values = new Set(group.map((f) => f.value));
    if (values.size > 1) {
      conflicts.push(...group);
    }
  }
  return conflicts;
}

/**
 * @mailmypdf/intelligence — Relationship model.
 *
 * A Relationship is a directed, typed link between two intelligence objects.
 *
 *   SOURCE ──(type)──→ TARGET
 *
 * Examples:
 *   Person ──(owns)──→ Property
 *   Agency ──(issued)──→ Notice
 *   Document ──(supports)──→ Fact
 *   Fact ──(conflicts_with)──→ Fact
 *
 * Relationships are generic — the platform never validates against a fixed
 * list of relationship types. Verticals define their own.
 *
 * The model supports future graph traversal without requiring a graph database.
 * Traversal is done in-memory via BFS/DFS over an array of relationships.
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
import type { ProvenanceLevel } from "./provenance.js";
import { createProvenance, verifyProvenance, PROVENANCE_STRENGTH } from "./provenance.js";
import type { IntelligenceObject } from "./provenance.js";

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The kind of intelligence object a relationship endpoint refers to.
 * This is used for type-safe graph traversal.
 */
export type IntelligenceType =
  | "entity"
  | "fact"
  | "evidence"
  | "finding"
  | "timeline_event"
  | "deadline"
  | "relationship"
  | "document";

export type RelationshipStatus = "active" | "retracted";

export interface Relationship extends IntelligenceObject {
  /** Source object */
  readonly fromType: IntelligenceType;
  readonly fromId: PlatformId;
  /** Target object */
  readonly toType: IntelligenceType;
  readonly toId: PlatformId;
  /** Relationship type (e.g., "supports", "issued", "owns", "conflicts_with") */
  readonly type: string;
  readonly status: RelationshipStatus;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export const MAX_RELATIONSHIP_TYPE_LENGTH = 100;

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateRelationshipInput {
  id?: string;
  fromType: IntelligenceType;
  fromId: string;
  toType: IntelligenceType;
  toId: string;
  type: string;
  metadata?: Record<string, unknown>;
  provenance: {
    level: ProvenanceLevel;
    sourceRefs?: readonly SourceRef[];
    modelId?: string;
    verifiedBy?: string;
    ruleId?: string;
  };
  confidence?: number;
}

export function createRelationship(input: CreateRelationshipInput): Relationship {
  const fromIdCheck = validateNonEmpty(input.fromId, "fromId");
  if (!fromIdCheck.ok) throw fromIdCheck.error;

  const toIdCheck = validateNonEmpty(input.toId, "toId");
  if (!toIdCheck.ok) throw toIdCheck.error;

  if (input.fromId === input.toId && input.fromType === input.toType) {
    throw new Error("Cannot create a relationship from an object to itself");
  }

  const typeCheck = validateNonEmpty(input.type, "type");
  if (!typeCheck.ok) throw typeCheck.error;

  const typeLen = validateMaxLength(input.type, "type", MAX_RELATIONSHIP_TYPE_LENGTH);
  if (!typeLen.ok) throw typeLen.error;

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.5);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    fromType: input.fromType,
    fromId: createId(input.fromId),
    toType: input.toType,
    toId: createId(input.toId),
    type: input.type,
    status: "active",
    metadata: input.metadata ?? {},
    provenance: prov,
    confidence: conf,
    verified: prov.level === "human_verified",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Verification ──────────────────────────────────────────────────────────────

export function verifyRelationship(rel: Relationship, verifiedBy: string): Relationship {
  return {
    ...rel,
    provenance: verifyProvenance(rel.provenance, verifiedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Retraction ────────────────────────────────────────────────────────────────

export function retractRelationship(rel: Relationship): Relationship {
  return { ...rel, status: "retracted" as RelationshipStatus, updatedAt: new Date().toISOString() };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateRelationship(rel: Relationship): Result<void, ValidationError> {
  if (!rel.fromId || rel.fromId.trim().length === 0) {
    return err(new ValidationError("Relationship fromId must not be empty"));
  }
  if (!rel.toId || rel.toId.trim().length === 0) {
    return err(new ValidationError("Relationship toId must not be empty"));
  }
  if (rel.fromId === rel.toId && rel.fromType === rel.toType) {
    return err(new ValidationError("Relationship cannot point from an object to itself"));
  }
  if (!rel.type || rel.type.trim().length === 0) {
    return err(new ValidationError("Relationship type must not be empty"));
  }
  if (rel.type.length > MAX_RELATIONSHIP_TYPE_LENGTH) {
    return err(new ValidationError(`Relationship type exceeds ${MAX_RELATIONSHIP_TYPE_LENGTH} chars`));
  }
  return ok(undefined);
}

// ── Duplicate Detection ───────────────────────────────────────────────────────

/**
 * Two relationships are duplicates if they have the same from, to, and type.
 * Metadata differences are NOT considered — same structural link = duplicate.
 */
export function isDuplicate(a: Relationship, b: Relationship): boolean {
  return (
    a.fromType === b.fromType &&
    a.fromId === b.fromId &&
    a.toType === b.toType &&
    a.toId === b.toId &&
    a.type === b.type
  );
}

/**
 * Remove duplicate relationships, keeping the one with stronger provenance.
 */
export function deduplicateRelationships(rels: readonly Relationship[]): Relationship[] {
  const seen = new Map<string, Relationship>();
  for (const r of rels) {
    if (r.status !== "active") continue;
    const key = `${r.fromType}:${r.fromId}|${r.toType}:${r.toId}|${r.type}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, r);
    } else {
      // Keep the one with stronger provenance
      const existingStrength = PROVENANCE_STRENGTH[existing.provenance.level];
      const newStrength = PROVENANCE_STRENGTH[r.provenance.level];
      if (newStrength > existingStrength) {
        seen.set(key, r);
      }
    }
  }
  return [...seen.values()];
}

// ── Graph Traversal ──────────────────────────────────────────────────────────

/**
 * Find all relationships from a specific object.
 */
export function relationshipsFrom(
  rels: readonly Relationship[],
  fromType: IntelligenceType,
  fromId: PlatformId,
): Relationship[] {
  return rels.filter((r) => r.status === "active" && r.fromType === fromType && r.fromId === fromId);
}

/**
 * Find all relationships to a specific object.
 */
export function relationshipsTo(
  rels: readonly Relationship[],
  toType: IntelligenceType,
  toId: PlatformId,
): Relationship[] {
  return rels.filter((r) => r.status === "active" && r.toType === toType && r.toId === toId);
}

/**
 * Find all relationships of a specific type.
 */
export function relationshipsOfType(
  rels: readonly Relationship[],
  type: string,
): Relationship[] {
  return rels.filter((r) => r.status === "active" && r.type === type);
}

/**
 * BFS traversal from a starting node, returning all reachable node IDs.
 * Max depth prevents infinite loops in cyclic graphs.
 */
export function traverseBFS(
  rels: readonly Relationship[],
  startType: IntelligenceType,
  startId: PlatformId,
  maxDepth: number = 10,
): { type: IntelligenceType; id: PlatformId; depth: number }[] {
  const visited = new Set<string>([`${startType}:${startId}`]);
  const queue: { type: IntelligenceType; id: PlatformId; depth: number }[] = [
    { type: startType, id: startId, depth: 0 },
  ];
  const result: { type: IntelligenceType; id: PlatformId; depth: number }[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    // Don't expand beyond max depth — but still include the node itself
    if (node.depth >= maxDepth) continue;

    const outgoing = relationshipsFrom(rels, node.type, node.id);
    for (const rel of outgoing) {
      const key = `${rel.toType}:${rel.toId}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ type: rel.toType, id: rel.toId, depth: node.depth + 1 });
      }
    }
  }

  return result;
}

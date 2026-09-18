import type { PlatformId } from "@mailmypdf/core";
import type { Finding } from "./finding.js";
import type { IntelligenceType, Relationship } from "./relationship.js";

export type TraceNodeType = IntelligenceType | "contradiction";

export interface TraceNodeRef {
  type: TraceNodeType;
  id: PlatformId;
}

export interface RelationshipTrace {
  node: TraceNodeRef;
  incoming: readonly Relationship[];
  outgoing: readonly Relationship[];
  sources: readonly TraceNodeRef[];
  targets: readonly TraceNodeRef[];
}

/**
 * Trace the immediate graph neighborhood around an intelligence node.
 *
 * This is the generalized replacement for the legacy Code Enforcement
 * evidence-graph lookup. It uses the canonical Relationship model rather than
 * introducing a second graph representation.
 */
export function traceRelationships(
  relationships: readonly Relationship[],
  node: TraceNodeRef,
): RelationshipTrace {
  const active = relationships.filter((relationship) => relationship.status === "active");
  const incoming = active.filter(
    (relationship) =>
      relationship.toType === node.type &&
      relationship.toId === node.id,
  );
  const outgoing = active.filter(
    (relationship) =>
      relationship.fromType === node.type &&
      relationship.fromId === node.id,
  );

  return {
    node,
    incoming,
    outgoing,
    sources: incoming.map((relationship) => ({
      type: relationship.fromType,
      id: relationship.fromId,
    })),
    targets: outgoing.map((relationship) => ({
      type: relationship.toType,
      id: relationship.toId,
    })),
  };
}

export interface FindingDerivationTrace {
  findingId: PlatformId;
  facts: readonly TraceNodeRef[];
  evidence: readonly TraceNodeRef[];
  contradictions: readonly TraceNodeRef[];
  entities: readonly TraceNodeRef[];
  all: readonly TraceNodeRef[];
}

/**
 * Expose every canonical derivation reference recorded on a Finding.
 *
 * No source is invented and no confidence is upgraded. This simply turns the
 * finding's stored derivation IDs into a UI/runtime-friendly trace structure.
 */
export function traceFindingDerivation(finding: Finding): FindingDerivationTrace {
  const facts = finding.factIds.map((id) => ({ type: "fact" as const, id }));
  const evidence = finding.evidenceIds.map((id) => ({ type: "evidence" as const, id }));
  const contradictions = finding.contradictionIds.map((id) => ({
    type: "contradiction" as const,
    id,
  }));
  const entities = finding.entityIds.map((id) => ({ type: "entity" as const, id }));

  return {
    findingId: finding.id,
    facts,
    evidence,
    contradictions,
    entities,
    all: [...facts, ...evidence, ...contradictions, ...entities],
  };
}

/**
 * Follow active relationships backwards from a target node to discover source
 * nodes up to maxDepth. Cycles are tolerated and never revisited.
 */
export function traceSources(
  relationships: readonly Relationship[],
  target: TraceNodeRef,
  maxDepth = 8,
): readonly TraceNodeRef[] {
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) {
    throw new Error("traceSources maxDepth must be a non-negative integer");
  }

  const active = relationships.filter((relationship) => relationship.status === "active");
  const seen = new Set<string>([`${target.type}:${target.id}`]);
  const discovered: TraceNodeRef[] = [];
  let frontier: TraceNodeRef[] = [target];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: TraceNodeRef[] = [];
    for (const node of frontier) {
      for (const relationship of active) {
        if (relationship.toType !== node.type || relationship.toId !== node.id) continue;
        const source: TraceNodeRef = {
          type: relationship.fromType,
          id: relationship.fromId,
        };
        const key = `${source.type}:${source.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        discovered.push(source);
        next.push(source);
      }
    }
    frontier = next;
  }

  return discovered;
}

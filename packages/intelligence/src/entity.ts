/**
 * @mailmypdf/intelligence — Entity model.
 *
 * An Entity is a named thing mentioned in documents: an agency,
 * a person, a case number, an address, a statute, etc.
 *
 * Entities are NOT legal-specific. The `type` field is open-ended
 * so any vertical can define its own entity types.
 */

import {
  type Confidence,
  type PlatformId,
  createId,
  confidence as mkConfidence,
  validateNonEmpty,
  validateMaxLength,
  validateRange,
  ok,
  err,
  type Result,
  ValidationError,
} from "@mailmypdf/core";
import type { SourceRef } from "@mailmypdf/documents";
import type { ProvenanceRecord, ProvenanceLevel } from "./provenance.js";
import { createProvenance, verifyProvenance } from "./provenance.js";
import type { IntelligenceObject } from "./provenance.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityStatus = "active" | "merged" | "deprecated";

export interface Entity extends IntelligenceObject {
  readonly type: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly status: EntityStatus;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export const MAX_ENTITY_NAME_LENGTH = 200;
export const MAX_ENTITY_TYPE_LENGTH = 100;
export const MAX_ALIASES = 20;

// ── Factory ───────────────────────────────────────────────────────────────────

export interface CreateEntityInput {
  id?: string;
  type: string;
  name: string;
  aliases?: readonly string[];
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

export function createEntity(input: CreateEntityInput): Entity {
  const nameCheck = validateNonEmpty(input.name, "name");
  if (!nameCheck.ok) throw nameCheck.error;

  const nameLenCheck = validateMaxLength(input.name, "name", MAX_ENTITY_NAME_LENGTH);
  if (!nameLenCheck.ok) throw nameLenCheck.error;

  const typeCheck = validateNonEmpty(input.type, "type");
  if (!typeCheck.ok) throw typeCheck.error;

  const typeLenCheck = validateMaxLength(input.type, "type", MAX_ENTITY_TYPE_LENGTH);
  if (!typeLenCheck.ok) throw typeLenCheck.error;

  const aliases = (input.aliases ?? []).filter((a, i, arr) => a.trim() !== "" && arr.indexOf(a) === i);
  if (aliases.length > MAX_ALIASES) {
    throw new Error(`Entity cannot have more than ${MAX_ALIASES} aliases`);
  }

  const prov = createProvenance(input.provenance);
  const now = new Date().toISOString();
  const conf = mkConfidence(input.confidence ?? 0.5);
  const id = createId(input.id ?? crypto.randomUUID());

  return {
    id,
    type: input.type,
    name: input.name,
    aliases,
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

export function verifyEntity(entity: Entity, verifiedBy: string): Entity {
  return {
    ...entity,
    provenance: verifyProvenance(entity.provenance, verifiedBy),
    verified: true,
    updatedAt: new Date().toISOString(),
  };
}

// ── Status Management ─────────────────────────────────────────────────────────

export function mergeEntity(source: Entity, target: Entity): Entity {
  if (source.id === target.id) throw new Error("Cannot merge entity into itself");
  return {
    ...target,
    aliases: [...new Set([...target.aliases, ...source.aliases, source.name])].slice(0, MAX_ALIASES),
    metadata: { ...source.metadata, ...target.metadata },
    updatedAt: new Date().toISOString(),
  };
}

export function deprecateEntity(entity: Entity): Entity {
  return { ...entity, status: "deprecated" as EntityStatus, updatedAt: new Date().toISOString() };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateEntity(entity: Entity): Result<void, ValidationError> {
  if (!entity.name || entity.name.trim().length === 0) {
    return err(new ValidationError("Entity name must not be empty"));
  }
  if (entity.name.length > MAX_ENTITY_NAME_LENGTH) {
    return err(new ValidationError(`Entity name exceeds ${MAX_ENTITY_NAME_LENGTH} chars`));
  }
  if (!entity.type || entity.type.trim().length === 0) {
    return err(new ValidationError("Entity type must not be empty"));
  }
  if (entity.type.length > MAX_ENTITY_TYPE_LENGTH) {
    return err(new ValidationError(`Entity type exceeds ${MAX_ENTITY_TYPE_LENGTH} chars`));
  }
  if (entity.aliases.length > MAX_ALIASES) {
    return err(new ValidationError(`Entity has more than ${MAX_ALIASES} aliases`));
  }
  return ok(undefined);
}

// ── Alias Management ─────────────────────────────────────────────────────────

export function addAlias(entity: Entity, alias: string): Entity {
  if (entity.aliases.includes(alias)) return entity;
  if (entity.aliases.length >= MAX_ALIASES) {
    throw new Error(`Entity already has maximum ${MAX_ALIASES} aliases`);
  }
  return {
    ...entity,
    aliases: [...entity.aliases, alias],
    updatedAt: new Date().toISOString(),
  };
}

// ── Matching ─────────────────────────────────────────────────────────────────

export function matchesName(entity: Entity, query: string): boolean {
  const lower = query.toLowerCase();
  if (entity.name.toLowerCase() === lower) return true;
  return entity.aliases.some((a) => a.toLowerCase() === lower);
}

export function findByType(entities: readonly Entity[], type: string): Entity[] {
  return entities.filter((e) => e.type === type);
}

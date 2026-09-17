import type {
  AuthoritativeNameCandidate,
  EntityClassificationSignal,
} from "@mailmypdf/identity-capacity";
import { normalizeName } from "@mailmypdf/identity-capacity";
import { toAuthoritySource } from "../types.js";
import type { BusinessRegistryRecord } from "./types.js";
import type { RegistrySourceDescriptor } from "../types.js";

function classifyEntityType(entityType: string | undefined): EntityClassificationSignal["proposedType"] {
  const value = (entityType ?? "").toLowerCase();
  if (/\b(llc|limited liability|corporation|corp\.?|incorporated|inc\.?|limited partnership|\blp\b|\bllp\b|professional corporation|pllc)\b/.test(value)) {
    return "registered-organization";
  }
  if (/sole propriet/.test(value)) return "sole-proprietorship";
  if (/trust/.test(value)) return "trust";
  if (/estate/.test(value)) return "estate";
  if (/government|county|city|state agency|district/.test(value)) return "government-entity";
  return "unknown";
}

export function businessRecordToAuthoritativeNameCandidate(input: {
  record: BusinessRegistryRecord;
  source: RegistrySourceDescriptor;
  entityId?: string;
}): AuthoritativeNameCandidate {
  normalizeName(input.record.legalName);
  return {
    id: `${input.source.id}:${input.record.sourceRecordId}:name`,
    rawName: input.record.legalName,
    confidence: 0.98,
    entityId: input.entityId,
    source: toAuthoritySource(input.source, input.record),
  };
}

export function businessRecordToEntityClassificationSignal(input: {
  record: BusinessRegistryRecord;
  source: RegistrySourceDescriptor;
  entityId?: string;
}): EntityClassificationSignal {
  return {
    id: `${input.source.id}:${input.record.sourceRecordId}:entity-type`,
    proposedType: classifyEntityType(input.record.entityType),
    confidence: input.record.entityType ? 0.95 : 0.5,
    entityId: input.entityId,
    source: toAuthoritySource(input.source, input.record),
    reason: input.record.entityType
      ? `Registry entity type: ${input.record.entityType}`
      : "Registry record did not expose an entity type.",
  };
}

export function businessRecordSearchNames(record: BusinessRegistryRecord): string[] {
  return [...new Set([
    record.legalName,
    ...(record.alternateNames ?? []),
  ].flatMap((name) => normalizeName(name).searchVariants))];
}

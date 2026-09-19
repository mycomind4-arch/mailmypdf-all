import type {
  NormalizedRegistryRecordBatch,
  RegistryProvenance,
  RegistryRecord,
} from "../types.js";

export interface RawBusinessRegistryRecord {
  recordId?: string;
  registrationNumber?: string;
  legalName?: string;
  jurisdiction?: string;
  entityType?: string;
  status?: string;
  formedAt?: string;
  sourceUri?: string;
  alternateNames?: readonly string[];
}

export interface NormalizedBusinessRegistryRecord {
  registrationNumber?: string;
  legalName: string;
  jurisdiction: string;
  entityType?: string;
  status?: string;
  formedAt?: string;
  sourceUri?: string;
  alternateNames: readonly string[];
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : undefined;
}

function uniqueNames(values: readonly string[] | undefined): string[] {
  const map = new Map<string, string>();
  for (const value of values ?? []) {
    const trimmed = clean(value);
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("en-US");
    if (!map.has(key)) map.set(key, trimmed);
  }
  return [...map.values()];
}

export function normalizeBusinessRegistryRecord(input: {
  raw: RawBusinessRegistryRecord;
  provenance: RegistryProvenance;
}): RegistryRecord<NormalizedBusinessRegistryRecord> {
  const legalName = clean(input.raw.legalName);
  if (!legalName) throw new Error("A business-registry record requires a legal name.");

  const recordId =
    clean(input.raw.recordId) ??
    clean(input.raw.registrationNumber) ??
    `${input.provenance.jurisdiction}:${legalName.toLocaleLowerCase("en-US")}`;

  return {
    id: recordId,
    kind: "business-registry",
    rawReference: clean(input.raw.sourceUri) ?? recordId,
    normalized: {
      registrationNumber: clean(input.raw.registrationNumber),
      legalName,
      jurisdiction: clean(input.raw.jurisdiction) ?? input.provenance.jurisdiction,
      entityType: clean(input.raw.entityType),
      status: clean(input.raw.status),
      formedAt: clean(input.raw.formedAt),
      sourceUri: clean(input.raw.sourceUri) ?? input.provenance.sourceUri,
      alternateNames: uniqueNames(input.raw.alternateNames),
    },
    provenance: input.provenance,
  };
}

export function createBusinessRegistrySearchResult(input: {
  rawRecords: readonly RawBusinessRegistryRecord[];
  provenance: RegistryProvenance;
  complete: boolean;
  warnings?: readonly string[];
}): NormalizedRegistryRecordBatch<NormalizedBusinessRegistryRecord> {
  const records = input.rawRecords.map((raw) =>
    normalizeBusinessRegistryRecord({ raw, provenance: input.provenance }),
  );
  const warnings = [...(input.warnings ?? [])];
  if (records.length === 0) warnings.push("no-hit-does-not-prove-entity-does-not-exist");
  if (!input.complete) warnings.push("search-coverage-incomplete");

  return {
    status: input.complete ? "complete" : "partial",
    records,
    warnings: [...new Set(warnings)],
  };
}

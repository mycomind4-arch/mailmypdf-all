import type {
  NormalizedRegistryRecordBatch,
  RegistryProvenance,
  RegistryRecord,
} from "../types.js";

export interface RawUccFilingRecord {
  recordId?: string;
  filingNumber?: string;
  jurisdiction?: string;
  debtorNames?: readonly string[];
  securedPartyNames?: readonly string[];
  filedAt?: string;
  status?: string;
  collateralText?: string;
  sourceUri?: string;
}

export interface NormalizedUccFilingRecord {
  filingNumber?: string;
  jurisdiction: string;
  debtorNames: readonly string[];
  securedPartyNames: readonly string[];
  filedAt?: string;
  status?: string;
  collateralText?: string;
  sourceUri?: string;
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function names(values: readonly string[] | undefined): string[] {
  const map = new Map<string, string>();
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("en-US");
    if (!map.has(key)) map.set(key, trimmed);
  }
  return [...map.values()];
}

export function normalizeUccFilingRecord(input: {
  raw: RawUccFilingRecord;
  provenance: RegistryProvenance;
}): RegistryRecord<NormalizedUccFilingRecord> {
  const recordId = text(input.raw.recordId) ?? text(input.raw.filingNumber);
  if (!recordId) {
    throw new Error("A UCC search record requires a provider record id or filing number.");
  }

  const normalized: NormalizedUccFilingRecord = {
    filingNumber: text(input.raw.filingNumber),
    jurisdiction: text(input.raw.jurisdiction) ?? input.provenance.jurisdiction,
    debtorNames: names(input.raw.debtorNames),
    securedPartyNames: names(input.raw.securedPartyNames),
    filedAt: text(input.raw.filedAt),
    status: text(input.raw.status),
    collateralText: text(input.raw.collateralText),
    sourceUri: text(input.raw.sourceUri) ?? input.provenance.sourceUri,
  };

  return {
    id: recordId,
    kind: "ucc-search",
    rawReference: text(input.raw.sourceUri) ?? recordId,
    normalized,
    provenance: input.provenance,
  };
}

export function createUccSearchResult(input: {
  rawRecords: readonly RawUccFilingRecord[];
  provenance: RegistryProvenance;
  complete: boolean;
  warnings?: readonly string[];
}): NormalizedRegistryRecordBatch<NormalizedUccFilingRecord> {
  const records = input.rawRecords.map((raw) =>
    normalizeUccFilingRecord({ raw, provenance: input.provenance }),
  );

  const warnings = [...(input.warnings ?? [])];
  if (records.length === 0) {
    warnings.push("no-hit-does-not-prove-no-competing-interest");
  }
  if (!input.complete) warnings.push("search-coverage-incomplete");

  return {
    status: input.complete ? "complete" : "partial",
    records,
    warnings: [...new Set(warnings)],
  };
}

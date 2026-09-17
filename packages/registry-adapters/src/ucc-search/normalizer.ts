import { normalizeName, type NormalizedName } from "@mailmypdf/identity-capacity";
import type { UccFilingRecord, UccSearchResult } from "./types.js";

export interface NormalizedUccFilingRecord {
  readonly record: UccFilingRecord;
  readonly debtorNames: readonly NormalizedName[];
  readonly securedPartyNames: readonly NormalizedName[];
}

export function normalizeUccFilingRecord(
  record: UccFilingRecord,
): NormalizedUccFilingRecord {
  return {
    record,
    debtorNames: record.debtorNames.map(normalizeName),
    securedPartyNames: record.securedPartyNames.map(normalizeName),
  };
}

export function uccNoHitIsConclusive(result: UccSearchResult): boolean {
  return result.records.length === 0 &&
    result.completeness === "complete" &&
    result.providerLimitations.length === 0;
}

export function explainUccSearchLimitations(result: UccSearchResult): string[] {
  const warnings = [...result.warnings, ...result.providerLimitations];
  if (result.completeness !== "complete") {
    warnings.push(
      "The UCC search is not represented as complete; no-hit results must not be treated as proof that no competing filing exists.",
    );
  }
  if (result.searchedNames.length === 0) {
    warnings.push("No debtor-name search variants were recorded for this search.");
  }
  return [...new Set(warnings)];
}

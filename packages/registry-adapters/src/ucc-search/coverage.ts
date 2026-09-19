import type { NormalizedRegistryRecordBatch } from "../types.js";
import type { NormalizedUccFilingRecord } from "./normalizer.js";

export interface UccSearchCoverageSummary {
  complete: boolean;
  resultCount: number;
  jurisdictions: readonly string[];
  warnings: readonly string[];
  noHitConclusive: false;
}

export function summarizeUccSearchCoverage(
  result: NormalizedRegistryRecordBatch<NormalizedUccFilingRecord>,
): UccSearchCoverageSummary {
  return {
    complete: result.status === "complete",
    resultCount: result.records.length,
    jurisdictions: [
      ...new Set(result.records.map((record) => record.normalized.jurisdiction)),
    ],
    warnings: result.warnings,
    noHitConclusive: false,
  };
}

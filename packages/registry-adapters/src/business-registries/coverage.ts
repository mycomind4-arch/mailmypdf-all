import type { RegistrySearchResult } from "../types.js";
import type { NormalizedBusinessRegistryRecord } from "./normalizer.js";

export interface BusinessRegistryCoverageSummary {
  complete: boolean;
  resultCount: number;
  jurisdictions: readonly string[];
  warnings: readonly string[];
  noHitConclusive: false;
}

export function summarizeBusinessRegistryCoverage(
  result: RegistrySearchResult<NormalizedBusinessRegistryRecord>,
): BusinessRegistryCoverageSummary {
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

import type {
  RegistryQuery,
  RegistrySearchResult,
} from "../types.js";
import type { NormalizedUccFilingRecord } from "./normalizer.js";

export interface UccSearchAdapter {
  readonly id: string;
  readonly provider: string;
  readonly jurisdictions: readonly string[];
  search(query: RegistryQuery): Promise<RegistrySearchResult<NormalizedUccFilingRecord>>;
}

export function supportsUccSearchJurisdiction(
  adapter: UccSearchAdapter,
  jurisdiction: string,
): boolean {
  return adapter.jurisdictions.includes(jurisdiction);
}

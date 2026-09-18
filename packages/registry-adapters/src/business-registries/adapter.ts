import type {
  RegistryQuery,
  RegistrySearchResult,
} from "../types.js";
import type { NormalizedBusinessRegistryRecord } from "./normalizer.js";

export interface BusinessRegistryAdapter {
  readonly id: string;
  readonly provider: string;
  readonly jurisdictions: readonly string[];
  search(query: RegistryQuery): Promise<RegistrySearchResult<NormalizedBusinessRegistryRecord>>;
}

export function supportsBusinessRegistryJurisdiction(
  adapter: BusinessRegistryAdapter,
  jurisdiction: string,
): boolean {
  return adapter.jurisdictions.includes(jurisdiction);
}

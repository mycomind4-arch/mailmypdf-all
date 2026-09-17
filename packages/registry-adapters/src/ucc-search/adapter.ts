import type { RegistryAdapter } from "../types.js";
import type { UccFilingRecord, UccSearchQuery, UccSearchResult } from "./types.js";

export interface UccSearchAdapter extends RegistryAdapter<UccFilingRecord> {
  readonly source: RegistryAdapter<UccFilingRecord>["source"] & {
    readonly kind: "ucc-filing-office";
  };
  search(query: UccSearchQuery): Promise<UccSearchResult>;
}

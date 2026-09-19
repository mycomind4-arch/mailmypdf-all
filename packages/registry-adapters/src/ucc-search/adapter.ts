import type { RegistryAdapter } from "../types.js";
import type { NormalizedUccFilingRecord } from "./normalizer.js";

/**
 * A registered UCC filing-office source. Extends the canonical
 * RegistryAdapter contract (source metadata + supports/search) rather than
 * defining its own parallel shape, so it can be registered directly with
 * RegistryAdapterRegistry and driven by search-strategy.ts.
 */
export interface UccSearchAdapter extends RegistryAdapter<NormalizedUccFilingRecord> {}

/**
 * Whether an adapter's declared source jurisdiction covers the given
 * country code (state/county/city are ignored here — this is a coarse
 * "is this adapter even in the right country" check; per-query jurisdiction
 * matching, including state/county/city, is RegistryAdapterRegistry's job).
 */
export function supportsUccSearchJurisdiction(
  adapter: UccSearchAdapter,
  countryCode: string,
): boolean {
  return adapter.source.jurisdiction.country.toLowerCase() === countryCode.toLowerCase();
}

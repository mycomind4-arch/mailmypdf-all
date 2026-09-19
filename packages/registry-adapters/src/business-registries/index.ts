export {
  supportsBusinessRegistryJurisdiction,
} from "./adapter.js";
export type { BusinessRegistryAdapter } from "./adapter.js";

export {
  normalizeBusinessRegistryRecord,
  createBusinessRegistrySearchResult,
} from "./normalizer.js";
export type {
  RawBusinessRegistryRecord,
  NormalizedBusinessRegistryRecord,
} from "./normalizer.js";

export {
  summarizeBusinessRegistryCoverage,
} from "./coverage.js";
export type {
  BusinessRegistryCoverageSummary,
} from "./coverage.js";

export { BusinessRegistryAdapterRegistry } from "./registry.js";
export type {
  BusinessEntityStatus,
  BusinessRegistryQuery,
  BusinessRegistryRecord,
  BusinessRegistrySearchResult,
} from "./types.js";

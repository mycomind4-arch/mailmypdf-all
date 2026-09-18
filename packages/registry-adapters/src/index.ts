export type {
  RegistrySourceKind,
  RegistryAccessMethod,
  RegistryCapability,
  SearchCompleteness,
  RegistrySourceCompliance,
  RegistrySourceDescriptor,
  RegistrySearchQuery,
  RegistryArtifact,
  RegistryRecord,
  RegistrySearchResult,
  RegistryAdapter,
} from "./types.js";
export {
  normalizeRegistryArtifact,
  toAuthoritySource,
} from "./types.js";
export type { RegistryAdapterErrorCode } from "./errors.js";
export { RegistryAdapterError } from "./errors.js";
export {
  assertRegistrySourceUsable,
  sourceSupportsCapability,
} from "./source-policy.js";
export { RegistryAdapterRegistry } from "./adapter-registry.js";
export type {
  SearchVariantKind,
  SearchNameSeed,
  SearchStrategyPolicy,
  SearchPlanStep,
  SearchPlan,
  SearchAttempt,
  SearchExecution,
} from "./search-strategy.js";
export {
  SAFE_DEFAULT_SEARCH_POLICY,
  buildNameSearchPlan,
  executeSearchPlan,
  searchExecutionNoHitIsConclusive,
} from "./search-strategy.js";
export * from "./business-registries/index.js";
export * from "./ucc-search/index.js";
export { searchExecutionToCertificationCoverage } from "./certification-coverage.js";

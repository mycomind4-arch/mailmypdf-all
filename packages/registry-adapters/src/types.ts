// Canonical registry-adapter contracts.
//
// One model, used consistently by adapter registration/routing
// (adapter-registry.ts), compliance gating (source-policy.ts), search
// planning/execution (search-strategy.ts), and the domain-specific
// business-registry/UCC-search subsystems built on top of it.
//
// RegistrySearchQuery.jurisdiction is structured because adapter routing and
// search planning need to match/filter on it. RegistryProvenance.jurisdiction
// stays a plain string because it is a citation of what a specific record
// actually says, not something routing logic matches against — the two are
// deliberately different concepts and are not meant to converge into one type.

export type RegistryAdapterKind = "business-registry" | "ucc-search" | "public-index";

export type RegistryCapability = "name-search" | "identifier-search" | "filing-search";

export type RegistryAccessMethod = "api" | "html" | "browser";

export type SearchCompleteness = "complete" | "provider-limited" | "partial" | "unknown";

export interface RegistryJurisdiction {
  readonly country: string;
  readonly state?: string | undefined;
  readonly county?: string | undefined;
  readonly city?: string | undefined;
}

export interface RegistrySourceComplianceStatus {
  robotsChecked: boolean;
  termsReviewed: boolean;
  automationAllowed: boolean;
}

/**
 * Describes one registered, addressable registry source: what it can be
 * searched for, where it lives, and whether it has cleared the compliance
 * review required before automated access (source-policy.ts enforces this).
 */
export interface RegistrySourceDescriptor {
  id: string;
  name: string;
  kind: RegistryAdapterKind;
  jurisdiction: RegistryJurisdiction;
  capabilities: readonly RegistryCapability[];
  officialUrl: string;
  accessMethod: RegistryAccessMethod;
  enabled: boolean;
  compliance?: RegistrySourceComplianceStatus;
}

export interface RegistrySearchQuery {
  readonly queryId: string;
  readonly purpose: string;
  readonly jurisdiction: RegistryJurisdiction;
  readonly names: readonly string[];
}

/** A citation of the specific request/response that produced one record. */
export interface RegistryProvenance {
  provider: string;
  jurisdiction: string;
  queriedAt: string;
  query: string;
  sourceUri?: string;
}

export interface RegistryRecord<T = unknown> {
  id: string;
  kind: RegistryAdapterKind;
  rawReference?: string;
  normalized: T;
  provenance: RegistryProvenance;
}

/**
 * A batch of raw provider records normalized into RegistryRecords, with a
 * coarse two-state completeness flag. Deliberately smaller than
 * RegistrySearchResult: it is what the business-registry/UCC-search
 * normalization helpers (normalizeBusinessRegistryRecord and friends)
 * produce from a flat provenance citation, before any real adapter/search
 * routing is involved — it never fabricates a RegistrySearchQuery or
 * RegistrySourceDescriptor that wasn't actually part of that call.
 */
export interface NormalizedRegistryRecordBatch<T = unknown> {
  status: "complete" | "partial";
  records: readonly RegistryRecord<T>[];
  warnings: readonly string[];
}

export interface RegistrySearchResult<T = unknown> {
  readonly query: RegistrySearchQuery;
  readonly source: RegistrySourceDescriptor;
  readonly records: readonly RegistryRecord<T>[];
  readonly completeness: SearchCompleteness;
  readonly searchedAt: string;
  readonly warnings: readonly string[];
}

/**
 * The canonical shape a registry adapter implementation must satisfy to be
 * registered with RegistryAdapterRegistry and driven by search-strategy.ts.
 * `supports` lets an adapter refuse a query its declared source metadata
 * would otherwise appear to match (e.g. a sub-jurisdiction it doesn't
 * actually cover yet); `search` performs the real (or, in tests, fixture)
 * lookup.
 */
export interface RegistryAdapter<T = unknown> {
  readonly source: RegistrySourceDescriptor;
  supports(query: RegistrySearchQuery): boolean;
  search(query: RegistrySearchQuery): Promise<RegistrySearchResult<T>>;
}

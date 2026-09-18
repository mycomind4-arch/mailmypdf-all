export type RegistryAdapterKind = "business-registry" | "ucc-search";

export interface RegistryQuery {
  jurisdiction: string;
  query: string;
  variants?: readonly string[];
}

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

export interface RegistrySearchResult<T = unknown> {
  status: "complete" | "partial" | "unavailable" | "unsupported";
  records: readonly RegistryRecord<T>[];
  warnings: readonly string[];
}

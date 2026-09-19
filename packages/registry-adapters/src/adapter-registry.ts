import type {
  RegistryAdapter,
  RegistryCapability,
  RegistryJurisdiction,
  RegistrySearchQuery,
  RegistrySourceDescriptor,
} from "./types.js";

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function jurisdictionMatches(source: RegistryJurisdiction, query: RegistryJurisdiction): boolean {
  if (normalize(source.country) !== normalize(query.country)) return false;
  if (query.state && normalize(source.state) !== normalize(query.state)) return false;
  if (query.county && normalize(source.county) !== normalize(query.county)) return false;
  if (query.city && normalize(source.city) !== normalize(query.city)) return false;
  return true;
}

export class RegistryAdapterRegistry {
  private readonly adapters = new Map<string, RegistryAdapter>();

  register(adapter: RegistryAdapter): this {
    if (!adapter.source.id.trim()) throw new Error("REGISTRY_ADAPTER_SOURCE_ID_REQUIRED");
    if (this.adapters.has(adapter.source.id)) {
      throw new Error(`REGISTRY_ADAPTER_ALREADY_REGISTERED:${adapter.source.id}`);
    }
    this.adapters.set(adapter.source.id, adapter);
    return this;
  }

  get(sourceId: string): RegistryAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  list(filters?: {
    jurisdiction?: RegistryJurisdiction;
    capability?: RegistryCapability;
    kind?: RegistrySourceDescriptor["kind"];
    enabledOnly?: boolean;
  }): RegistryAdapter[] {
    return [...this.adapters.values()].filter((adapter) => {
      if (filters?.jurisdiction && !jurisdictionMatches(adapter.source.jurisdiction, filters.jurisdiction)) return false;
      if (filters?.capability && !adapter.source.capabilities.includes(filters.capability)) return false;
      if (filters?.kind && adapter.source.kind !== filters.kind) return false;
      if (filters?.enabledOnly && !adapter.source.enabled) return false;
      return true;
    });
  }

  resolve(query: RegistrySearchQuery, options?: {
    capability?: RegistryCapability;
    kind?: RegistrySourceDescriptor["kind"];
  }): RegistryAdapter[] {
    return this.list({
      jurisdiction: query.jurisdiction,
      capability: options?.capability,
      kind: options?.kind,
      enabledOnly: true,
    }).filter((adapter) => adapter.supports(query));
  }
}

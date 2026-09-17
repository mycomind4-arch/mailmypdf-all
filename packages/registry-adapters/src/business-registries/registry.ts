import { RegistryAdapterRegistry } from "../adapter-registry.js";
import type { BusinessRegistryAdapter } from "./adapter.js";
import type { BusinessRegistryQuery } from "./types.js";

export class BusinessRegistryAdapterRegistry {
  private readonly registry = new RegistryAdapterRegistry();

  register(adapter: BusinessRegistryAdapter): this {
    this.registry.register(adapter);
    return this;
  }

  get(sourceId: string): BusinessRegistryAdapter | undefined {
    return this.registry.get(sourceId) as BusinessRegistryAdapter | undefined;
  }

  resolve(query: BusinessRegistryQuery): BusinessRegistryAdapter[] {
    return this.registry.resolve(query, {
      capability: query.identifiers && Object.values(query.identifiers).some(Boolean)
        ? "identifier-search"
        : "name-search",
      kind: "business-registry",
    }) as BusinessRegistryAdapter[];
  }

  list(): BusinessRegistryAdapter[] {
    return this.registry.list({ kind: "business-registry" }) as BusinessRegistryAdapter[];
  }
}

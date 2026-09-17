import { RegistryAdapterRegistry } from "../adapter-registry.js";
import type { UccSearchAdapter } from "./adapter.js";
import type { UccSearchQuery } from "./types.js";

export class UccSearchAdapterRegistry {
  private readonly registry = new RegistryAdapterRegistry();

  register(adapter: UccSearchAdapter): this {
    this.registry.register(adapter);
    return this;
  }

  get(sourceId: string): UccSearchAdapter | undefined {
    return this.registry.get(sourceId) as UccSearchAdapter | undefined;
  }

  resolve(query: UccSearchQuery): UccSearchAdapter[] {
    return this.registry.resolve(query, {
      capability: query.filingNumber ? "identifier-search" : "filing-search",
      kind: "ucc-filing-office",
    }) as UccSearchAdapter[];
  }

  list(): UccSearchAdapter[] {
    return this.registry.list({ kind: "ucc-filing-office" }) as UccSearchAdapter[];
  }
}

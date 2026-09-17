import type { RegistryAdapter } from "../types.js";
import type { BusinessRegistryRecord } from "./types.js";

export interface BusinessRegistryAdapter extends RegistryAdapter<BusinessRegistryRecord> {
  readonly source: RegistryAdapter<BusinessRegistryRecord>["source"] & {
    readonly kind: "business-registry";
  };
}

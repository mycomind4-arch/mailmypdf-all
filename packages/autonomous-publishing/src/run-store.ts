import type { PublicationRun, RenderedEdition } from "./types.js";

export interface StoredPublicationRun {
  run: PublicationRun;
  rendered?: RenderedEdition;
}

export interface PublicationRunStore {
  save(value: StoredPublicationRun): Promise<void>;
  get(runId: string): Promise<StoredPublicationRun | undefined>;
}

export function createMemoryPublicationRunStore(): PublicationRunStore {
  const values = new Map<string, StoredPublicationRun>();
  return {
    async save(value) {
      values.set(value.run.id, structuredClone(value));
    },
    async get(runId) {
      const value = values.get(runId);
      return value ? structuredClone(value) : undefined;
    },
  };
}

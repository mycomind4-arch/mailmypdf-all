import { WorkflowRuntimeError } from "./matter-runtime.js";

export interface ConfirmedMatterInput<T extends Record<string, unknown> = Record<string, unknown>> {
  version: number;
  input: T;
  confirmedBy: string;
  createdAt: string;
}

export interface MatterInputPersistence<T extends Record<string, unknown>> {
  loadLatest(ownerId: string, matterId: string): Promise<ConfirmedMatterInput<T> | null>;
  append(input: {
    ownerId: string;
    matterId: string;
    version: number;
    value: T;
    confirmedBy: string;
    createdAt: string;
  }): Promise<ConfirmedMatterInput<T>>;
}

/**
 * Stores user/workflow-confirmed facts in their own immutable version chain.
 * Extracted document data must not be written through this interface.
 */
export async function saveConfirmedMatterInput<T extends Record<string, unknown>>(input: {
  ownerId: string;
  matterId: string;
  actorId: string;
  value: unknown;
  validate(value: unknown): T;
  persistence: MatterInputPersistence<T>;
  now?: () => string;
}): Promise<ConfirmedMatterInput<T>> {
  if (!input.ownerId || !input.matterId || !input.actorId) {
    throw new WorkflowRuntimeError("Matter input identity is incomplete", "MATTER_INPUT_IDENTITY_INVALID");
  }
  if (input.ownerId !== input.actorId) {
    throw new WorkflowRuntimeError("Matter input owner mismatch", "MATTER_INPUT_OWNER_MISMATCH");
  }

  const value = input.validate(input.value);
  const latest = await input.persistence.loadLatest(input.ownerId, input.matterId);
  const version = (latest?.version ?? 0) + 1;
  return input.persistence.append({
    ownerId: input.ownerId,
    matterId: input.matterId,
    version,
    value,
    confirmedBy: input.actorId,
    createdAt: (input.now ?? (() => new Date().toISOString()))(),
  });
}

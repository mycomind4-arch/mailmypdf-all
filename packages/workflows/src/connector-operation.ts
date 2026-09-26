export type ConnectorOperationKind =
  | "ingest_document"
  | "save_matter_input"
  | "analyze_matter"
  | "generate_draft"
  | "save_draft"
  | "preview_packet"
  | "approve_packet"
  | "prepare_checkout"
  | "mailing";

export type ConnectorOperationState =
  | "queued"
  | "running"
  | "waiting_for_user"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ConnectorOperationError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type ConnectorOperation<TResult = unknown> = {
  id: string;
  kind: ConnectorOperationKind;
  ownerId: string;
  matterId: string;
  idempotencyKey: string;
  requestSha256: string;
  state: ConnectorOperationState;
  revision: number;
  createdAt: string;
  updatedAt: string;
  requiredAction?: string;
  result?: TResult;
  error?: ConnectorOperationError;
};

export type CreateConnectorOperationInput = {
  id: string;
  kind: ConnectorOperationKind;
  ownerId: string;
  matterId: string;
  idempotencyKey: string;
  requestSha256: string;
  now: string;
};

export interface ConnectorOperationRepository {
  /** Atomically create the operation or return the existing idempotent row. */
  create(operation: ConnectorOperation): Promise<{
    operation: ConnectorOperation;
    created: boolean;
  }>;
  /** Return an operation only when it belongs to the supplied owner. */
  loadOwned(ownerId: string, operationId: string): Promise<ConnectorOperation | null>;
  /** Persist exactly one optimistic revision transition. */
  save(
    operation: ConnectorOperation,
    expectedRevision: number,
  ): Promise<ConnectorOperation>;
}

export class ConnectorOperationIdempotencyConflict extends Error {
  readonly code = "CONNECTOR_OPERATION_IDEMPOTENCY_CONFLICT";
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function timestamp(value: string): string {
  if (Number.isNaN(Date.parse(value))) throw new Error("Operation timestamp must be an ISO date-time.");
  return value;
}

export function createConnectorOperation(
  input: CreateConnectorOperationInput,
): ConnectorOperation {
  const now = timestamp(input.now);
  return {
    id: required(input.id, "Operation id"),
    kind: input.kind,
    ownerId: required(input.ownerId, "Owner id"),
    matterId: required(input.matterId, "Matter id"),
    idempotencyKey: required(input.idempotencyKey, "Idempotency key"),
    requestSha256: requiredSha256(input.requestSha256),
    state: "queued",
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function requiredSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Operation request SHA-256 must be a 64-character hexadecimal digest.");
  }
  return normalized;
}

const TERMINAL_STATES = new Set<ConnectorOperationState>([
  "succeeded",
  "failed",
  "cancelled",
]);

const ALLOWED_TRANSITIONS: Readonly<Record<ConnectorOperationState, readonly ConnectorOperationState[]>> = {
  queued: ["running", "waiting_for_user", "failed", "cancelled"],
  running: ["waiting_for_user", "succeeded", "failed", "cancelled"],
  waiting_for_user: ["running", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function transitionConnectorOperation<TResult = unknown>(
  operation: ConnectorOperation<TResult>,
  nextState: ConnectorOperationState,
  update: {
    now: string;
    requiredAction?: string;
    result?: TResult;
    error?: ConnectorOperationError;
  },
): ConnectorOperation<TResult> {
  if (TERMINAL_STATES.has(operation.state)) {
    throw new Error(`Connector operation ${operation.id} is terminal (${operation.state}).`);
  }
  if (nextState === "waiting_for_user" && !update.requiredAction?.trim()) {
    throw new Error("A waiting connector operation requires a required action.");
  }
  if (nextState === "succeeded" && update.result === undefined) {
    throw new Error("A succeeded connector operation requires a result.");
  }
  if (nextState === "failed" && !update.error) {
    throw new Error("A failed connector operation requires an error.");
  }
  if (!ALLOWED_TRANSITIONS[operation.state].includes(nextState)) {
    throw new Error(`Cannot transition connector operation from ${operation.state} to ${nextState}.`);
  }

  const updatedAt = timestamp(update.now);
  if (Date.parse(updatedAt) < Date.parse(operation.updatedAt)) {
    throw new Error("Connector operation update cannot move backward in time.");
  }

  return {
    ...operation,
    state: nextState,
    revision: operation.revision + 1,
    updatedAt,
    ...(nextState === "waiting_for_user"
      ? { requiredAction: update.requiredAction!.trim() }
      : { requiredAction: undefined }),
    ...(nextState === "succeeded" ? { result: update.result, error: undefined } : {}),
    ...(nextState === "failed" ? { error: update.error, result: undefined } : {}),
  };
}

function assertRepositoryIdentity(
  expected: ConnectorOperation,
  actual: ConnectorOperation,
): void {
  if (
    actual.ownerId !== expected.ownerId ||
    actual.kind !== expected.kind ||
    actual.idempotencyKey !== expected.idempotencyKey
  ) {
    throw new Error("Connector operation repository returned a mismatched operation.");
  }
  if (actual.matterId !== expected.matterId) {
    throw new ConnectorOperationIdempotencyConflict(
      "The idempotency key is already bound to another matter.",
    );
  }
  if (actual.requestSha256 !== expected.requestSha256) {
    throw new ConnectorOperationIdempotencyConflict(
      "The idempotency key is already bound to different tool arguments.",
    );
  }
}

/**
 * Begins a durable operation without allowing a retry to create a second
 * external effect. The repository owns the atomic uniqueness guarantee.
 */
export async function beginConnectorOperation(
  repository: ConnectorOperationRepository,
  input: CreateConnectorOperationInput,
): Promise<{ operation: ConnectorOperation; created: boolean }> {
  const candidate = createConnectorOperation(input);
  const stored = await repository.create(candidate);
  assertRepositoryIdentity(candidate, stored.operation);
  return stored;
}

export async function loadOwnedConnectorOperation(
  repository: ConnectorOperationRepository,
  ownerId: string,
  operationId: string,
): Promise<ConnectorOperation | null> {
  const normalizedOwnerId = required(ownerId, "Owner id");
  const normalizedOperationId = required(operationId, "Operation id");
  const operation = await repository.loadOwned(normalizedOwnerId, normalizedOperationId);
  if (!operation) return null;
  if (operation.ownerId !== normalizedOwnerId || operation.id !== normalizedOperationId) {
    throw new Error("Connector operation repository crossed an ownership boundary.");
  }
  return operation;
}

export async function transitionStoredConnectorOperation<TResult = unknown>(
  repository: ConnectorOperationRepository,
  operation: ConnectorOperation<TResult>,
  nextState: ConnectorOperationState,
  update: {
    now: string;
    requiredAction?: string;
    result?: TResult;
    error?: ConnectorOperationError;
  },
): Promise<ConnectorOperation<TResult>> {
  const next = transitionConnectorOperation(operation, nextState, update);
  const stored = await repository.save(next, operation.revision);
  if (
    stored.id !== next.id ||
    stored.ownerId !== next.ownerId ||
    stored.matterId !== next.matterId ||
    stored.kind !== next.kind ||
    stored.idempotencyKey !== next.idempotencyKey ||
    stored.requestSha256 !== next.requestSha256 ||
    stored.revision !== next.revision
  ) {
    throw new Error("Connector operation repository did not preserve transition identity.");
  }
  return stored as ConnectorOperation<TResult>;
}

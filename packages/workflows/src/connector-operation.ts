export type ConnectorOperationKind =
  | "ingest_document"
  | "analyze_matter"
  | "generate_draft"
  | "preview_packet"
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
  state: ConnectorOperationState;
  revision: number;
  createdAt: string;
  updatedAt: string;
  requiredAction?: string;
  result?: TResult;
  error?: ConnectorOperationError;
};

type CreateConnectorOperationInput = {
  id: string;
  kind: ConnectorOperationKind;
  ownerId: string;
  matterId: string;
  idempotencyKey: string;
  now: string;
};

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
    state: "queued",
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
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

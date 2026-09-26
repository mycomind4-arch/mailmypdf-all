import {
  beginConnectorOperation,
  loadOwnedConnectorOperation,
  transitionStoredConnectorOperation,
  type ConnectorOperation,
  type ConnectorOperationError,
  type ConnectorOperationKind,
  type ConnectorOperationRepository,
  type ConnectorOperationState,
} from "@mailmypdf/workflows/connector-operation";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadCase } from "@/lib/secure-core/case.server";
import type { AuthenticatedUserContext } from "@/lib/secure-core/auth.server";

const OPERATION_KINDS = new Set<ConnectorOperationKind>([
  "ingest_document",
  "save_matter_input",
  "analyze_matter",
  "generate_draft",
  "save_draft",
  "preview_packet",
  "approve_packet",
  "prepare_checkout",
  "mailing",
]);
const OPERATION_STATES = new Set<ConnectorOperationState>([
  "queued",
  "running",
  "waiting_for_user",
  "succeeded",
  "failed",
  "cancelled",
]);
const MAX_RESULT_BYTES = 256 * 1024;

type ConnectorOperationRow = {
  id: string;
  owner_id: string;
  matter_id: string;
  kind: string;
  idempotency_key: string;
  request_sha256: string;
  state: string;
  revision: number;
  required_action: string | null;
  result: Json | null;
  error: Json | null;
  created_at: string;
  updated_at: string;
};

function operationError(value: Json | null): ConnectorOperationError | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") return undefined;
  const code = value.code;
  const message = value.message;
  const retryable = value.retryable;
  if (typeof code !== "string" || typeof message !== "string" || typeof retryable !== "boolean") {
    throw new Error("Stored connector operation error is invalid.");
  }
  return { code, message, retryable };
}

function fromRow(row: ConnectorOperationRow): ConnectorOperation {
  if (!OPERATION_KINDS.has(row.kind as ConnectorOperationKind)) {
    throw new Error("Stored connector operation kind is invalid.");
  }
  if (!OPERATION_STATES.has(row.state as ConnectorOperationState)) {
    throw new Error("Stored connector operation state is invalid.");
  }
  return {
    id: row.id,
    ownerId: row.owner_id,
    matterId: row.matter_id,
    kind: row.kind as ConnectorOperationKind,
    idempotencyKey: row.idempotency_key,
    requestSha256: row.request_sha256,
    state: row.state as ConnectorOperationState,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.required_action ? { requiredAction: row.required_action } : {}),
    ...(row.result !== null ? { result: row.result } : {}),
    ...(row.error !== null ? { error: operationError(row.error) } : {}),
  };
}

function jsonValue(value: unknown, label: string): Json {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error(`${label} is not JSON serializable.`);
  if (Buffer.byteLength(serialized, "utf8") > MAX_RESULT_BYTES) {
    throw new Error(`${label} exceeds the connector operation storage limit.`);
  }
  return JSON.parse(serialized) as Json;
}

function createRow(operation: ConnectorOperation) {
  return {
    id: operation.id,
    owner_id: operation.ownerId,
    matter_id: operation.matterId,
    kind: operation.kind,
    idempotency_key: operation.idempotencyKey,
    request_sha256: operation.requestSha256,
    state: operation.state,
    revision: operation.revision,
    required_action: operation.requiredAction ?? null,
    result: operation.result === undefined ? null : jsonValue(operation.result, "Operation result"),
    error: operation.error ? jsonValue(operation.error, "Operation error") : null,
    created_at: operation.createdAt,
    updated_at: operation.updatedAt,
  };
}

const OPERATION_COLUMNS =
  "id,owner_id,matter_id,kind,idempotency_key,request_sha256,state,revision,required_action,result,error,created_at,updated_at";

export async function saveConnectorOperationIfRevision(
  operation: ConnectorOperation,
  expectedRevision: number,
  expectedState?: ConnectorOperationState,
): Promise<ConnectorOperation | null> {
  const row = createRow(operation);
  let query = supabaseAdmin
    .from("connector_operations")
    .update({
      state: row.state,
      revision: row.revision,
      required_action: row.required_action,
      result: row.result,
      error: row.error,
      updated_at: row.updated_at,
    })
    .eq("id", operation.id)
    .eq("owner_id", operation.ownerId)
    .eq("revision", expectedRevision);
  if (expectedState) query = query.eq("state", expectedState);
  const { data, error } = await query
    .select(OPERATION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error("Unable to update the connector operation.");
  return data ? fromRow(data) : null;
}

export async function listStaleRunningConnectorOperations(input: {
  updatedBefore: string;
  limit: number;
}): Promise<readonly ConnectorOperation[]> {
  const { data, error } = await supabaseAdmin
    .from("connector_operations")
    .select(OPERATION_COLUMNS)
    .eq("state", "running")
    .lte("updated_at", input.updatedBefore)
    .order("updated_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(input.limit);
  if (error) throw new Error("Unable to list stale connector operations.");
  return (data ?? []).map((row) => fromRow(row));
}

export class SupabaseConnectorOperationRepository implements ConnectorOperationRepository {
  constructor(private readonly context: AuthenticatedUserContext) {}

  async create(operation: ConnectorOperation) {
    await loadCase(operation.matterId, this.context);
    const { data, error } = await supabaseAdmin
      .from("connector_operations")
      .insert(createRow(operation))
      .select(OPERATION_COLUMNS)
      .single();

    if (!error && data) return { operation: fromRow(data), created: true };
    if (error?.code !== "23505") {
      throw new Error("Unable to create the connector operation.");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("connector_operations")
      .select(OPERATION_COLUMNS)
      .eq("owner_id", operation.ownerId)
      .eq("kind", operation.kind)
      .eq("idempotency_key", operation.idempotencyKey)
      .maybeSingle();
    if (existingError || !existing) {
      throw new Error("Unable to recover the idempotent connector operation.");
    }
    return { operation: fromRow(existing), created: false };
  }

  async loadOwned(ownerId: string, operationId: string) {
    const { data, error } = await this.context.supabase
      .from("connector_operations")
      .select(OPERATION_COLUMNS)
      .eq("id", operationId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw new Error("Unable to read the connector operation.");
    return data ? fromRow(data as ConnectorOperationRow) : null;
  }

  async save(operation: ConnectorOperation, expectedRevision: number) {
    const saved = await saveConnectorOperationIfRevision(operation, expectedRevision);
    if (!saved) throw new Error("Connector operation revision conflict.");
    return saved;
  }
}

export type ConnectorOperationExecution<TResult> = {
  operation: ConnectorOperation<TResult>;
  replayed: boolean;
  output?: TResult;
};

export async function executeDurableConnectorOperation<TResult>(input: {
  context: AuthenticatedUserContext;
  kind: ConnectorOperationKind;
  matterId: string;
  idempotencyKey: string;
  requestSha256: string;
  execute(): Promise<TResult>;
  mapError(error: unknown): ConnectorOperationError;
}): Promise<ConnectorOperationExecution<TResult>> {
  const repository = new SupabaseConnectorOperationRepository(input.context);
  const begun = await beginConnectorOperation(repository, {
    id: crypto.randomUUID(),
    kind: input.kind,
    ownerId: input.context.user.id,
    matterId: input.matterId,
    idempotencyKey: input.idempotencyKey,
    requestSha256: input.requestSha256,
    now: new Date().toISOString(),
  });

  let running: ConnectorOperation<TResult>;
  if (begun.created || begun.operation.state === "queued") {
    try {
      running = await transitionStoredConnectorOperation<TResult>(
        repository,
        begun.operation as ConnectorOperation<TResult>,
        "running",
        { now: new Date().toISOString() },
      );
    } catch (error) {
      if (begun.created) throw error;
      const current = await repository.loadOwned(input.context.user.id, begun.operation.id);
      if (!current) throw new Error("Connector operation disappeared during retry.");
      return {
        operation: current as ConnectorOperation<TResult>,
        replayed: true,
        ...(current.state === "succeeded" ? { output: current.result as TResult } : {}),
      };
    }
  } else {
    const existing = begun.operation as ConnectorOperation<TResult>;
    return {
      operation: existing,
      replayed: true,
      ...(existing.state === "succeeded" ? { output: existing.result as TResult } : {}),
    };
  }

  try {
    const output = await input.execute();
    const succeeded = await transitionStoredConnectorOperation(
      repository,
      running,
      "succeeded",
      { now: new Date().toISOString(), result: output },
    );
    return { operation: succeeded, replayed: !begun.created, output };
  } catch (error) {
    try {
      await transitionStoredConnectorOperation(repository, running, "failed", {
        now: new Date().toISOString(),
        error: input.mapError(error),
      });
    } catch {
      // Do not replace the original tool failure with a secondary persistence
      // error. A running row remains visible for operational reconciliation.
    }
    throw error;
  }
}

export async function getOwnedConnectorOperation(
  context: AuthenticatedUserContext,
  operationId: string,
): Promise<ConnectorOperation | null> {
  return loadOwnedConnectorOperation(
    new SupabaseConnectorOperationRepository(context),
    context.user.id,
    operationId,
  );
}

export function publicConnectorOperation(
  operation: ConnectorOperation,
  options: { includeResult?: boolean } = {},
) {
  return {
    id: operation.id,
    kind: operation.kind,
    matterId: operation.matterId,
    state: operation.state,
    revision: operation.revision,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
    ...(operation.requiredAction ? { requiredAction: operation.requiredAction } : {}),
    ...(operation.state === "succeeded" && options.includeResult !== false
      ? { result: operation.result }
      : {}),
    ...(operation.state === "failed" ? { error: operation.error } : {}),
  };
}

import {
  createCompoundMatterState,
  getCompoundMatterStatus,
  type CompoundMatterState,
  type CompoundMatterStatus,
} from "@/domain/compound-workflow-runtime";
import {
  CompoundMatterOwnershipError,
  CompoundMatterVersionConflictError,
  type CompoundMatterEventInput,
  type CompoundMatterRepository,
} from "@/domain/compound-matter-repository";
import {
  compoundWorkflows,
  type CompoundWorkflowId,
} from "@/domain/compound-workflows";

interface CompoundMatterRow {
  id: string;
  owner_id: string;
  workflow_id: string;
  status: CompoundMatterStatus;
  version: number;
  state: unknown;
  created_at: string;
  updated_at: string;
}

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase compound-matter persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  }
  const root = url.replace(/\/$/, "");
  return {
    matters: `${root}/rest/v1/private_office_compound_matters`,
    createRpc: `${root}/rest/v1/rpc/private_office_create_compound_matter`,
    commitRpc: `${root}/rest/v1/rpc/private_office_commit_compound_state`,
    key,
  };
}

function headers(
  key: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

function isCompoundWorkflowId(value: string): value is CompoundWorkflowId {
  return Object.prototype.hasOwnProperty.call(compoundWorkflows, value);
}

function fromRow(row: CompoundMatterRow): CompoundMatterState {
  if (!isCompoundWorkflowId(row.workflow_id)) {
    throw new Error(`Unknown persisted compound workflow: ${row.workflow_id}`);
  }
  if (typeof row.state !== "object" || row.state === null) {
    throw new Error("Persisted compound workflow state is invalid.");
  }

  const state = row.state as CompoundMatterState;
  if (
    state.id !== row.id ||
    state.ownerId !== row.owner_id ||
    state.workflowId !== row.workflow_id ||
    state.version !== row.version
  ) {
    throw new Error("Persisted compound workflow state does not match its row envelope.");
  }
  return state;
}

async function readRows(response: Response): Promise<CompoundMatterRow[]> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Supabase compound-matter persistence failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return response.json() as Promise<CompoundMatterRow[]>;
}

export class SupabaseCompoundMatterRepository
  implements CompoundMatterRepository
{
  async create(input: {
    ownerId: string;
    workflowId: CompoundWorkflowId;
    actorId: string;
  }): Promise<CompoundMatterState> {
    if (!input.ownerId.trim()) throw new Error("ownerId is required");
    const id = crypto.randomUUID();
    const state = createCompoundMatterState({
      id,
      ownerId: input.ownerId,
      workflowId: input.workflowId,
    });

    const { createRpc, key } = config();
    const response = await fetch(createRpc, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({
        p_id: id,
        p_owner_id: input.ownerId,
        p_workflow_id: input.workflowId,
        p_status: getCompoundMatterStatus(state),
        p_state: state,
        p_actor_id: input.actorId,
      }),
    });

    const rows = await readRows(response);
    if (!rows[0]) throw new Error("Supabase did not return the created compound matter.");
    return fromRow(rows[0]);
  }

  async get(
    ownerId: string,
    matterId: string,
  ): Promise<CompoundMatterState | null> {
    const { matters, key } = config();
    const response = await fetch(
      `${matters}?id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers: headers(key) },
    );
    const rows = await readRows(response);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(
    ownerId: string,
    workflowId?: CompoundWorkflowId,
  ): Promise<CompoundMatterState[]> {
    const { matters, key } = config();
    const workflowFilter = workflowId
      ? `&workflow_id=eq.${encodeURIComponent(workflowId)}`
      : "";
    const response = await fetch(
      `${matters}?owner_id=eq.${encodeURIComponent(ownerId)}${workflowFilter}&order=updated_at.desc`,
      { headers: headers(key) },
    );
    const rows = await readRows(response);
    return rows.map(fromRow);
  }

  async commit(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    nextState: CompoundMatterState;
    status: CompoundMatterStatus;
    event: CompoundMatterEventInput;
  }): Promise<CompoundMatterState> {
    if (input.nextState.id !== input.matterId) {
      throw new Error("Compound matter state id does not match matterId.");
    }
    if (input.nextState.ownerId !== input.ownerId) {
      throw new CompoundMatterOwnershipError();
    }
    if (input.nextState.version !== input.expectedVersion + 1) {
      throw new Error("Compound matter state version must advance by exactly one.");
    }

    const { commitRpc, key } = config();
    const response = await fetch(commitRpc, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({
        p_matter_id: input.matterId,
        p_owner_id: input.ownerId,
        p_expected_version: input.expectedVersion,
        p_status: input.status,
        p_state: input.nextState,
        p_event_type: input.event.eventType,
        p_actor_id: input.event.actorId,
        p_metadata: input.event.metadata ?? {},
      }),
    });

    if (response.status === 409) throw new CompoundMatterVersionConflictError();
    if (response.status === 404) throw new CompoundMatterOwnershipError();

    const rows = await readRows(response);
    if (!rows[0]) throw new CompoundMatterVersionConflictError();
    return fromRow(rows[0]);
  }
}

export const supabaseCompoundMatterRepository =
  new SupabaseCompoundMatterRepository();

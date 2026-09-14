import { createStepMatterState, type StepMatterState } from "./step-workflow";
import {
  StepMatterOwnershipError,
  StepMatterVersionConflictError,
  type StepMatterEventInput,
  type StepMatterRepository,
} from "./step-matter-repository";
import type { StepWorkflowDefinition } from "./step-workflow";

interface StepMatterRow {
  id: string;
  owner_id: string;
  workflow_id: string;
  version: number;
  state: unknown;
  created_at: string;
  updated_at: string;
}

function headers(key: string): Record<string, string> {
  return { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
}

function fromRow(row: StepMatterRow): StepMatterState {
  if (typeof row.state !== "object" || row.state === null) {
    throw new Error("Persisted step-matter state is invalid.");
  }
  const state = row.state as StepMatterState;
  if (
    state.id !== row.id ||
    state.ownerId !== row.owner_id ||
    state.workflowId !== row.workflow_id ||
    state.version !== row.version
  ) {
    throw new Error("Persisted step-matter state does not match its row envelope.");
  }
  return state;
}

async function readRows(response: Response): Promise<StepMatterRow[]> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Supabase step-matter persistence failed with status ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return response.json() as Promise<StepMatterRow[]>;
}

/**
 * Generic Supabase-backed StepMatterRepository. Each consuming app names its
 * own tables/RPCs with a prefix (e.g. "private_office", "immigration_mail")
 * to match the SQL block it adds to its own schema — see
 * SupabaseStepMatterRepository.sqlTemplate for the exact SQL to add.
 */
export class SupabaseStepMatterRepository implements StepMatterRepository {
  private readonly mattersUrl: string;
  private readonly createRpcUrl: string;
  private readonly commitRpcUrl: string;
  private readonly key: string;

  constructor(config: { supabaseUrl: string; serviceRoleKey: string; tablePrefix: string }) {
    const root = config.supabaseUrl.replace(/\/$/, "");
    this.mattersUrl = `${root}/rest/v1/${config.tablePrefix}_step_matters`;
    this.createRpcUrl = `${root}/rest/v1/rpc/${config.tablePrefix}_create_step_matter`;
    this.commitRpcUrl = `${root}/rest/v1/rpc/${config.tablePrefix}_commit_step_state`;
    this.key = config.serviceRoleKey;
  }

  async create(input: {
    ownerId: string;
    definition: StepWorkflowDefinition;
    actorId: string;
  }): Promise<StepMatterState> {
    if (!input.ownerId.trim()) throw new Error("ownerId is required");
    const id = crypto.randomUUID();
    const state = createStepMatterState({ id, ownerId: input.ownerId, definition: input.definition });

    const response = await fetch(this.createRpcUrl, {
      method: "POST",
      headers: headers(this.key),
      body: JSON.stringify({
        p_id: id,
        p_owner_id: input.ownerId,
        p_workflow_id: input.definition.id,
        p_state: state,
        p_actor_id: input.actorId,
      }),
    });

    const rows = await readRows(response);
    if (!rows[0]) throw new Error("Supabase did not return the created step matter.");
    return fromRow(rows[0]);
  }

  async get(ownerId: string, matterId: string): Promise<StepMatterState | null> {
    const response = await fetch(
      `${this.mattersUrl}?id=eq.${encodeURIComponent(matterId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers: headers(this.key) },
    );
    const rows = await readRows(response);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(ownerId: string, workflowId?: string): Promise<StepMatterState[]> {
    const workflowFilter = workflowId ? `&workflow_id=eq.${encodeURIComponent(workflowId)}` : "";
    const response = await fetch(
      `${this.mattersUrl}?owner_id=eq.${encodeURIComponent(ownerId)}${workflowFilter}&order=updated_at.desc`,
      { headers: headers(this.key) },
    );
    const rows = await readRows(response);
    return rows.map(fromRow);
  }

  async commit(input: {
    ownerId: string;
    matterId: string;
    expectedVersion: number;
    nextState: StepMatterState;
    event: StepMatterEventInput;
  }): Promise<StepMatterState> {
    if (input.nextState.id !== input.matterId) {
      throw new Error("Step matter state id does not match matterId.");
    }
    if (input.nextState.ownerId !== input.ownerId) {
      throw new StepMatterOwnershipError();
    }
    if (input.nextState.version !== input.expectedVersion + 1) {
      throw new Error("Step matter state version must advance by exactly one.");
    }

    const response = await fetch(this.commitRpcUrl, {
      method: "POST",
      headers: headers(this.key),
      body: JSON.stringify({
        p_matter_id: input.matterId,
        p_owner_id: input.ownerId,
        p_expected_version: input.expectedVersion,
        p_state: input.nextState,
        p_event_type: input.event.eventType,
        p_actor_id: input.event.actorId,
        p_metadata: input.event.metadata ?? {},
      }),
    });

    if (response.status === 409) throw new StepMatterVersionConflictError();
    if (response.status === 404) throw new StepMatterOwnershipError();

    const rows = await readRows(response);
    if (!rows[0]) throw new StepMatterVersionConflictError();
    return fromRow(rows[0]);
  }
}

import type { WorkflowBuildApproval, WorkflowBuildRun, WorkflowBuildStatus } from "@mailmypdf/vertical-foundry/workflow-build";

export interface StoredWorkflowBuildRun {
  readonly id: string;
  readonly operatorId: string;
  readonly idempotencyKey: string;
  readonly run: WorkflowBuildRun;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WorkflowBuildRunRepository {
  save(input: Omit<StoredWorkflowBuildRun, "createdAt" | "updatedAt">): Promise<StoredWorkflowBuildRun>;
  get(id: string, operatorId: string): Promise<StoredWorkflowBuildRun | null>;
}

interface WorkflowBuildRunRow {
  id: string;
  operator_id: string;
  idempotency_key: string;
  spec: WorkflowBuildRun["spec"];
  spec_hash: string;
  status: WorkflowBuildStatus;
  approval: WorkflowBuildApproval | null;
  known_cost_usd: number;
  agent_tokens_used: number;
  created_at: string;
  updated_at: string;
}

function config(): { base: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Workflow Builder persistence is not configured.");
  return {
    base: `${url.replace(/\/$/, "")}/rest/v1/private_office_workflow_build_runs`,
    key,
  };
}

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

function fromRow(row: WorkflowBuildRunRow): StoredWorkflowBuildRun {
  return {
    id: row.id,
    operatorId: row.operator_id,
    idempotencyKey: row.idempotency_key,
    run: {
      id: row.id,
      spec: row.spec,
      specHash: row.spec_hash,
      status: row.status,
      approval: row.approval,
      knownCostUsd: Number(row.known_cost_usd),
      agentTokensUsed: Number(row.agent_tokens_used),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseWorkflowBuildRunRepository implements WorkflowBuildRunRepository {
  async save(input: Omit<StoredWorkflowBuildRun, "createdAt" | "updatedAt">): Promise<StoredWorkflowBuildRun> {
    const { base, key } = config();
    const response = await fetch(`${base}?on_conflict=idempotency_key`, {
      method: "POST",
      headers: headers(key, { Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify({
        id: input.id,
        operator_id: input.operatorId,
        idempotency_key: input.idempotencyKey,
        spec: input.run.spec,
        spec_hash: input.run.specHash,
        status: input.run.status,
        approval: input.run.approval,
        known_cost_usd: input.run.knownCostUsd,
        agent_tokens_used: input.run.agentTokensUsed,
      }),
    });
    if (!response.ok) throw new Error(`Workflow Builder persistence failed: ${response.status}`);
    const rows = await response.json() as WorkflowBuildRunRow[];
    if (!rows[0]) throw new Error("Workflow Builder persistence returned no run");
    return fromRow(rows[0]);
  }

  async get(id: string, operatorId: string): Promise<StoredWorkflowBuildRun | null> {
    const { base, key } = config();
    const response = await fetch(
      `${base}?id=eq.${encodeURIComponent(id)}&operator_id=eq.${encodeURIComponent(operatorId)}`,
      { headers: headers(key) },
    );
    if (!response.ok) throw new Error(`Workflow Builder lookup failed: ${response.status}`);
    const rows = await response.json() as WorkflowBuildRunRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }
}

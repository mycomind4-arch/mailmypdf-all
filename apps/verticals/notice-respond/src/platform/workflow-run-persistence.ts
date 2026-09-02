/**
 * Workflow Run Persistence — Supabase Implementation
 *
 * Provides durable storage for workflow execution state.
 * Integrated with factory's PipelineResult.
 */

import type {
  WorkflowRun,
  WorkflowRunInput,
  WorkflowRunRepository,
} from "@mailmypdf/workflows";
import { WorkflowRunOwnershipError, WorkflowRunVersionConflictError } from "@mailmypdf/workflows";
import type { PipelineStage, PipelineResult, StageResult } from "@mailmypdf/workflows";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Workflow persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

const BASE_URL = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/workflow_runs`;

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY!,
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

interface WorkflowRunRow {
  id: string;
  owner_id: string;
  matter_id: string;
  workflow_id: string;
  pipeline_id: string;
  status: "running" | "paused" | "blocked" | "completed" | "failed";
  current_step: PipelineStage | null;
  completed_stages: PipelineStage[];
  stage_results: StageResult[];
  pipeline_result: PipelineResult | null;
  error_message: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

function fromRow(row: WorkflowRunRow): WorkflowRun {
  return {
    id: row.id,
    ownerId: row.owner_id,
    matterId: row.matter_id,
    workflowId: row.workflow_id,
    pipelineId: row.pipeline_id,
    status: row.status,
    currentStep: row.current_step,
    completedStages: row.completed_stages || [],
    stageResults: row.stage_results || [],
    pipelineResult: row.pipeline_result,
    errorMessage: row.error_message,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(run: Omit<WorkflowRun, "createdAt" | "updatedAt">): Partial<WorkflowRunRow> {
  return {
    owner_id: run.ownerId,
    matter_id: run.matterId,
    workflow_id: run.workflowId,
    pipeline_id: run.pipelineId,
    status: run.status,
    current_step: run.currentStep,
    completed_stages: run.completedStages,
    stage_results: run.stageResults,
    pipeline_result: run.pipelineResult,
    error_message: run.errorMessage,
    version: run.version,
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Workflow persistence error (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
}

/**
 * SupabaseWorkflowRunRepository
 *
 * Implements owner-scoped, version-checked persistence for workflow runs.
 * Follows the same pattern as SupabaseMatterRepository.
 */
export class SupabaseWorkflowRunRepository implements WorkflowRunRepository {
  async create(input: WorkflowRunInput): Promise<WorkflowRun> {
    if (!input.ownerId.trim()) throw new Error("ownerId is required");

    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      owner_id: input.ownerId,
      matter_id: input.matterId,
      workflow_id: input.workflowId,
      pipeline_id: input.pipelineId,
      status: "running" as const,
      current_step: null,
      completed_stages: [],
      stage_results: [],
      pipeline_result: null,
      error_message: null,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });

    const created = await readResponse<WorkflowRunRow[]>(response);
    if (!created[0]) throw new Error("Supabase did not return the created run");
    return fromRow(created[0]);
  }

  async get(ownerId: string, runId: string): Promise<WorkflowRun | null> {
    const response = await fetch(
      `${BASE_URL}?id=eq.${encodeURIComponent(runId)}&owner_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers: headers() }
    );
    const rows = await readResponse<WorkflowRunRow[]>(response);
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async getByMatter(ownerId: string, matterId: string): Promise<WorkflowRun[]> {
    const response = await fetch(
      `${BASE_URL}?owner_id=eq.${encodeURIComponent(ownerId)}&matter_id=eq.${encodeURIComponent(matterId)}&order=created_at.desc`,
      { headers: headers() }
    );
    const rows = await readResponse<WorkflowRunRow[]>(response);
    return rows.map(fromRow);
  }

  async update(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    patch: Partial<Omit<WorkflowRun, "id" | "ownerId" | "matterId" | "createdAt">>,
  ): Promise<WorkflowRun> {
    const now = new Date().toISOString();
    const row = {
      ...toRow({ ...patch, id: runId, ownerId } as any),
      version: expectedVersion + 1,
      updated_at: now,
    };

    const response = await fetch(
      `${BASE_URL}?id=eq.${encodeURIComponent(runId)}&owner_id=eq.${encodeURIComponent(ownerId)}&version=eq.${expectedVersion}`,
      {
        method: "PATCH",
        headers: headers({ Prefer: "return=representation" }),
        body: JSON.stringify(row),
      }
    );

    const updated = await readResponse<WorkflowRunRow[]>(response);
    if (!updated[0]) {
      const existing = await this.get(ownerId, runId);
      if (!existing) throw new WorkflowRunOwnershipError();
      throw new WorkflowRunVersionConflictError();
    }
    return fromRow(updated[0]);
  }

  async recordStage(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    stageResult: StageResult,
  ): Promise<WorkflowRun> {
    const run = await this.get(ownerId, runId);
    if (!run) throw new WorkflowRunOwnershipError();
    if (run.version !== expectedVersion) throw new WorkflowRunVersionConflictError();

    return this.update(ownerId, runId, expectedVersion, {
      currentStep: stageResult.stage,
      completedStages: [...run.completedStages, stageResult.stage],
      stageResults: [...run.stageResults, stageResult],
    });
  }

  async setBlocked(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    reason: string,
  ): Promise<WorkflowRun> {
    return this.update(ownerId, runId, expectedVersion, {
      status: "blocked",
      errorMessage: reason,
    });
  }

  async setPipelineResult(
    ownerId: string,
    runId: string,
    expectedVersion: number,
    result: PipelineResult,
  ): Promise<WorkflowRun> {
    return this.update(ownerId, runId, expectedVersion, {
      status: result.status === "completed" ? "completed" : "paused",
      pipelineResult: result,
    });
  }
}

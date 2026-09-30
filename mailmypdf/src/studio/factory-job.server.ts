import {
  advanceFactoryJob,
  approveFactoryJobReview,
  cancelFactoryJob,
  createFactoryJob,
  failFactoryJobAcceptance,
  recordFactoryJobAcceptance,
  recordFactoryJobBuildArtifact,
  restoreFactoryJobSnapshot,
  startFactoryJobAcceptance,
  type FactoryBuildArtifact,
  type FactoryBuildCheck,
  type FactoryJob,
  type FactoryJobTransition,
  type ReviewedFactoryTemplateRequest,
} from "@mailmypdf/workflows";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PersistentFactoryJobEvent = Readonly<{
  id: string;
  jobId: string;
  revision: number;
  eventType: string;
  fromStage: string | null;
  toStage: string;
  data: Json;
  actorId: string | null;
  createdAt: string;
}>;

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function assertPersistedRow(
  row: {
    id: string;
    schema_version: string;
    revision: number;
    status: string;
    stage: string;
    selected_workflow_id: string | null;
    problem: string;
    job_json: Json;
  },
): FactoryJob {
  const job = restoreFactoryJobSnapshot(row.job_json);
  if (
    row.id !== job.id ||
    row.schema_version !== job.schemaVersion ||
    row.revision !== job.revision ||
    row.status !== job.status ||
    row.stage !== job.stage ||
    row.selected_workflow_id !== job.selectedWorkflowId ||
    row.problem !== job.problem
  ) {
    throw new Error("Persisted factory job columns do not match the canonical snapshot.");
  }
  return job;
}

export async function createPersistentFactoryJob(input: {
  problem: string;
  actorId: string;
  now?: string;
}): Promise<FactoryJob> {
  const now = input.now ?? new Date().toISOString();
  const job = createFactoryJob({
    id: crypto.randomUUID(),
    problem: input.problem,
    now,
  });

  const { data, error } = await supabaseAdmin.rpc("create_factory_job", {
    p_job_id: job.id,
    p_status: job.status,
    p_stage: job.stage,
    p_problem: job.problem,
    p_job_json: json(job),
    p_actor_id: input.actorId,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to persist factory job.");
  }
  return assertPersistedRow(data);
}

export async function loadPersistentFactoryJob(
  jobId: string,
): Promise<FactoryJob | null> {
  const { data, error } = await supabaseAdmin
    .from("factory_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? assertPersistedRow(data) : null;
}

export async function listPersistentFactoryJobs(
  limit = 50,
): Promise<readonly FactoryJob[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const { data, error } = await supabaseAdmin
    .from("factory_jobs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(error.message);
  return Object.freeze((data ?? []).map(assertPersistedRow));
}

export async function listPersistentFactoryJobEvents(
  jobId: string,
): Promise<readonly PersistentFactoryJobEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("factory_job_events")
    .select("*")
    .eq("job_id", jobId)
    .order("revision", { ascending: true });
  if (error) throw new Error(error.message);

  return Object.freeze(
    (data ?? []).map((event) =>
      Object.freeze({
        id: event.id,
        jobId: event.job_id,
        revision: event.revision,
        eventType: event.event_type,
        fromStage: event.from_stage,
        toStage: event.to_stage,
        data: event.data,
        actorId: event.actor_id,
        createdAt: event.created_at,
      }),
    ),
  );
}

async function persistTransition(
  current: FactoryJob,
  transition: FactoryJobTransition,
  actorId: string,
): Promise<FactoryJob> {
  if (
    transition.job.id !== current.id ||
    transition.job.revision !== current.revision + 1
  ) {
    throw new Error("Factory transition revision is invalid.");
  }

  const { data, error } = await supabaseAdmin.rpc("transition_factory_job", {
    p_job_id: current.id,
    p_expected_revision: current.revision,
    p_status: transition.job.status,
    p_stage: transition.job.stage,
    p_selected_workflow_id: transition.job.selectedWorkflowId,
    p_job_json: json(transition.job),
    p_event_type: transition.event.type,
    p_from_stage: transition.event.fromStage,
    p_to_stage: transition.event.toStage,
    p_event_data: json(transition.event.data),
    p_actor_id: actorId,
  });
  if (error || !data) {
    const message = error?.message ?? "Unable to persist factory transition.";
    if (/revision conflict/i.test(message)) {
      throw new Error("Factory job changed concurrently. Reload before retrying.");
    }
    throw new Error(message);
  }
  return assertPersistedRow(data);
}

function autoRunnable(job: FactoryJob): boolean {
  return (
    (job.status === "queued" || job.status === "running") &&
    (job.stage === "intake" || job.stage === "match" || job.stage === "certify" || job.stage === "build")
  );
}

/**
 * Run every deterministic factory stage that is currently implemented, then
 * stop at the first human-review or not-yet-implemented build boundary.
 */
export async function runPersistentFactoryJobToBoundary(input: {
  jobId: string;
  actorId: string;
  availableTools: readonly string[];
  now?: () => string;
}): Promise<FactoryJob> {
  let job = await loadPersistentFactoryJob(input.jobId);
  if (!job) throw new Error("Factory job was not found.");
  const now = input.now ?? (() => new Date().toISOString());

  for (let pass = 0; pass < 8 && autoRunnable(job); pass += 1) {
    const next = advanceFactoryJob(job, input.availableTools, now());
    job = await persistTransition(job, next, input.actorId);
  }

  return job;
}

export async function approvePersistentFactoryJobReview(input: {
  jobId: string;
  actorId: string;
  templateRequest?: ReviewedFactoryTemplateRequest;
  now?: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  const transition = approveFactoryJobReview(
    current,
    input.now ?? new Date().toISOString(),
    input.templateRequest,
  );
  return persistTransition(current, transition, input.actorId);
}

export async function startPersistentFactoryAcceptance(input: {
  jobId: string;
  actorId: string;
  now?: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  return persistTransition(
    current,
    startFactoryJobAcceptance(current, input.now ?? new Date().toISOString()),
    input.actorId,
  );
}

export async function recordPersistentFactoryBuildArtifact(input: {
  jobId: string;
  actorId: string;
  artifact: FactoryBuildArtifact;
  now?: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  return persistTransition(
    current,
    recordFactoryJobBuildArtifact(
      current,
      input.artifact,
      input.now ?? new Date().toISOString(),
    ),
    input.actorId,
  );
}

export async function failPersistentFactoryAcceptance(input: {
  jobId: string;
  actorId: string;
  code: string;
  message: string;
  now?: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  return persistTransition(
    current,
    failFactoryJobAcceptance(current, {
      code: input.code,
      message: input.message,
      now: input.now ?? new Date().toISOString(),
    }),
    input.actorId,
  );
}

export async function recordPersistentFactoryAcceptance(input: {
  jobId: string;
  actorId: string;
  checks: readonly FactoryBuildCheck[];
  now?: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  return persistTransition(
    current,
    recordFactoryJobAcceptance(current, {
      checks: input.checks,
      now: input.now ?? new Date().toISOString(),
    }),
    input.actorId,
  );
}

export async function cancelPersistentFactoryJob(input: {
  jobId: string;
  actorId: string;
  now?: string;
}): Promise<FactoryJob> {
  const current = await loadPersistentFactoryJob(input.jobId);
  if (!current) throw new Error("Factory job was not found.");
  const transition = cancelFactoryJob(
    current,
    input.now ?? new Date().toISOString(),
  );
  return persistTransition(current, transition, input.actorId);
}

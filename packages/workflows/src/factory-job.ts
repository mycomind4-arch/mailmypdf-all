import { canonicalChatFactoryReport } from "./chat-execution-registry.js";
import { planWorkflowFromProblem } from "./problem-workflow-plan.js";

export const FACTORY_JOB_SCHEMA_VERSION = "mailmypdf.factory-job/v1" as const;

export type FactoryJobStage =
  | "intake"
  | "match"
  | "certify"
  | "template_review"
  | "build"
  | "acceptance"
  | "publication_review"
  | "complete";

export type FactoryJobStatus =
  | "queued"
  | "running"
  | "awaiting_review"
  | "completed"
  | "failed"
  | "cancelled";

export type FactoryJobDiagnostic = Readonly<{
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}>;

export type FactoryBuildFamily = "records-request";

export type FactoryBuildRequest = Readonly<{
  family: FactoryBuildFamily;
  sectionId: "records-request";
  workflowId: string;
  label: string;
  startTemplate: "records-request";
}>;

export type FactoryBuildCheck = Readonly<{
  id: string;
  command: string;
  ok: boolean;
  summary: string;
}>;

export type FactoryBuildArtifact = Readonly<{
  branch: string;
  baseSha: string;
  commitSha: string;
  specPath: string;
  profileRegistryPath: string;
  configPath: string;
  changedFiles: readonly string[];
  checks: readonly FactoryBuildCheck[];
  builtAt: string;
}>;

export type FactoryJobPlanSnapshot = Readonly<{
  decision: "review-existing-workflow" | "needs-template-review";
  candidateId: string | null;
  candidates: readonly Readonly<{
    id: string;
    label: string;
    publicHref: string;
    chatExecutable: boolean;
    matchedTerms: readonly string[];
    score: number;
  }>[];
}>;

export type FactoryJob = Readonly<{
  schemaVersion: typeof FACTORY_JOB_SCHEMA_VERSION;
  id: string;
  revision: number;
  status: FactoryJobStatus;
  stage: FactoryJobStage;
  problem: string;
  plan: FactoryJobPlanSnapshot | null;
  selectedWorkflowId: string | null;
  buildRequest: FactoryBuildRequest | null;
  buildArtifact: FactoryBuildArtifact | null;
  diagnostics: readonly FactoryJobDiagnostic[];
  review: Readonly<{
    required: boolean;
    reason: string | null;
    approvedAt: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}>;

export type FactoryJobTransition = Readonly<{
  job: FactoryJob;
  event: Readonly<{
    type: string;
    fromStage: FactoryJobStage;
    toStage: FactoryJobStage;
    data: Readonly<Record<string, unknown>>;
  }>;
}>;

const FACTORY_JOB_STAGES = new Set<FactoryJobStage>([
  "intake",
  "match",
  "certify",
  "template_review",
  "build",
  "acceptance",
  "publication_review",
  "complete",
]);

const FACTORY_JOB_STATUSES = new Set<FactoryJobStatus>([
  "queued",
  "running",
  "awaiting_review",
  "completed",
  "failed",
  "cancelled",
]);

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requiredSnapshotString(
  value: unknown,
  label: string,
  maxLength = 10_000,
): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function nullableSnapshotString(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 10_000) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function restoreDiagnostics(value: unknown): readonly FactoryJobDiagnostic[] {
  if (!Array.isArray(value) || value.length > 200) {
    throw new Error("Factory job diagnostics are invalid.");
  }
  return Object.freeze(
    value.map((entry) => {
      const item = record(entry, "Factory job diagnostic");
      const severity = item.severity;
      if (severity !== "info" && severity !== "warning" && severity !== "error") {
        throw new Error("Factory job diagnostic severity is invalid.");
      }
      return Object.freeze({
        code: requiredSnapshotString(item.code, "Factory job diagnostic code", 200),
        message: requiredSnapshotString(item.message, "Factory job diagnostic message", 4000),
        severity,
      });
    }),
  );
}

function restoreBuildRequest(value: unknown): FactoryBuildRequest | null {
  if (value === undefined || value === null) return null;
  const source = record(value, "Factory build request");
  if (
    source.family !== "records-request" ||
    source.sectionId !== "records-request" ||
    source.startTemplate !== "records-request"
  ) {
    throw new Error("Factory build request family is invalid.");
  }
  const workflowId = requiredSnapshotString(
    source.workflowId,
    "Factory build workflow id",
    200,
  );
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-records-request$/.test(workflowId)) {
    throw new Error("Factory build workflow id is invalid.");
  }
  return Object.freeze({
    family: "records-request",
    sectionId: "records-request",
    workflowId,
    label: requiredSnapshotString(source.label, "Factory build label", 300),
    startTemplate: "records-request",
  });
}

function restoreBuildArtifact(value: unknown): FactoryBuildArtifact | null {
  if (value === undefined || value === null) return null;
  const source = record(value, "Factory build artifact");
  if (!Array.isArray(source.changedFiles) || source.changedFiles.some((item) => typeof item !== "string")) {
    throw new Error("Factory build changed files are invalid.");
  }
  if (!Array.isArray(source.checks) || source.checks.length > 50) {
    throw new Error("Factory build checks are invalid.");
  }
  const checks = source.checks.map((entry) => {
    const item = record(entry, "Factory build check");
    if (typeof item.ok !== "boolean") throw new Error("Factory build check status is invalid.");
    return Object.freeze({
      id: requiredSnapshotString(item.id, "Factory build check id", 200),
      command: requiredSnapshotString(item.command, "Factory build check command", 1000),
      ok: item.ok,
      summary: requiredSnapshotString(item.summary, "Factory build check summary", 4000),
    });
  });
  const builtAt = requiredSnapshotString(source.builtAt, "Factory build timestamp", 100);
  if (!Number.isFinite(Date.parse(builtAt))) throw new Error("Factory build timestamp is invalid.");
  return Object.freeze({
    branch: requiredSnapshotString(source.branch, "Factory build branch", 300),
    baseSha: requiredSnapshotString(source.baseSha, "Factory build base sha", 100),
    commitSha: requiredSnapshotString(source.commitSha, "Factory build commit sha", 100),
    specPath: requiredSnapshotString(source.specPath, "Factory build spec path", 1000),
    profileRegistryPath: requiredSnapshotString(source.profileRegistryPath, "Factory build profile path", 1000),
    configPath: requiredSnapshotString(source.configPath, "Factory build config path", 1000),
    changedFiles: Object.freeze([...source.changedFiles] as string[]),
    checks: Object.freeze(checks),
    builtAt,
  });
}

function restorePlan(value: unknown): FactoryJobPlanSnapshot | null {
  if (value === null) return null;
  const source = record(value, "Factory job plan");
  if (
    source.decision !== "review-existing-workflow" &&
    source.decision !== "needs-template-review"
  ) {
    throw new Error("Factory job plan decision is invalid.");
  }
  if (!Array.isArray(source.candidates) || source.candidates.length > 20) {
    throw new Error("Factory job plan candidates are invalid.");
  }

  const candidates = source.candidates.map((entry) => {
    const candidate = record(entry, "Factory job candidate");
    if (
      typeof candidate.chatExecutable !== "boolean" ||
      typeof candidate.score !== "number" ||
      !Number.isFinite(candidate.score) ||
      !Array.isArray(candidate.matchedTerms) ||
      candidate.matchedTerms.some((term) => typeof term !== "string")
    ) {
      throw new Error("Factory job candidate is invalid.");
    }
    return Object.freeze({
      id: requiredSnapshotString(candidate.id, "Factory job candidate id", 300),
      label: requiredSnapshotString(candidate.label, "Factory job candidate label", 500),
      publicHref: requiredSnapshotString(candidate.publicHref, "Factory job candidate href", 1000),
      chatExecutable: candidate.chatExecutable,
      matchedTerms: Object.freeze([...candidate.matchedTerms] as string[]),
      score: candidate.score,
    });
  });

  return Object.freeze({
    decision: source.decision,
    candidateId: nullableSnapshotString(source.candidateId, "Factory job candidate id"),
    candidates: Object.freeze(candidates),
  });
}

/** Restore one durable snapshot and reject drift/corruption before execution. */
export function restoreFactoryJobSnapshot(value: unknown): FactoryJob {
  const source = record(value, "Factory job snapshot");
  if (source.schemaVersion !== FACTORY_JOB_SCHEMA_VERSION) {
    throw new Error("Factory job snapshot schema version is unsupported.");
  }
  if (
    typeof source.revision !== "number" ||
    !Number.isSafeInteger(source.revision) ||
    source.revision < 1
  ) {
    throw new Error("Factory job snapshot revision is invalid.");
  }
  if (
    typeof source.stage !== "string" ||
    !FACTORY_JOB_STAGES.has(source.stage as FactoryJobStage)
  ) {
    throw new Error("Factory job snapshot stage is invalid.");
  }
  if (
    typeof source.status !== "string" ||
    !FACTORY_JOB_STATUSES.has(source.status as FactoryJobStatus)
  ) {
    throw new Error("Factory job snapshot status is invalid.");
  }

  const review = record(source.review, "Factory job review");
  if (typeof review.required !== "boolean") {
    throw new Error("Factory job review required flag is invalid.");
  }

  const createdAt = requiredSnapshotString(source.createdAt, "Factory job createdAt", 100);
  const updatedAt = requiredSnapshotString(source.updatedAt, "Factory job updatedAt", 100);
  if (!Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(updatedAt))) {
    throw new Error("Factory job timestamps are invalid.");
  }

  return Object.freeze({
    schemaVersion: FACTORY_JOB_SCHEMA_VERSION,
    id: requiredSnapshotString(source.id, "Factory job id", 200),
    revision: source.revision,
    status: source.status as FactoryJobStatus,
    stage: source.stage as FactoryJobStage,
    problem: normalizedProblem(
      requiredSnapshotString(source.problem, "Factory job problem", 4000),
    ),
    plan: restorePlan(source.plan),
    selectedWorkflowId: nullableSnapshotString(
      source.selectedWorkflowId,
      "Factory selected workflow id",
    ),
    buildRequest: restoreBuildRequest(source.buildRequest),
    buildArtifact: restoreBuildArtifact(source.buildArtifact),
    diagnostics: restoreDiagnostics(source.diagnostics),
    review: Object.freeze({
      required: review.required,
      reason: nullableSnapshotString(review.reason, "Factory job review reason"),
      approvedAt: nullableSnapshotString(
        review.approvedAt,
        "Factory job review approval time",
      ),
    }),
    createdAt,
    updatedAt,
  });
}

function normalizedProblem(problem: string): string {
  const value = problem.trim();
  if (!value) throw new Error("Factory job problem is required.");
  if (value.length > 4000) throw new Error("Factory job problem is limited to 4000 characters.");
  return value;
}

function diagnostic(
  code: string,
  message: string,
  severity: FactoryJobDiagnostic["severity"] = "error",
): FactoryJobDiagnostic {
  return Object.freeze({ code, message, severity });
}

function transition(
  job: FactoryJob,
  input: {
    status: FactoryJobStatus;
    stage: FactoryJobStage;
    eventType: string;
    data?: Record<string, unknown>;
    plan?: FactoryJobPlanSnapshot | null;
    selectedWorkflowId?: string | null;
    buildRequest?: FactoryBuildRequest | null;
    buildArtifact?: FactoryBuildArtifact | null;
    diagnostics?: readonly FactoryJobDiagnostic[];
    review?: FactoryJob["review"];
    now: string;
  },
): FactoryJobTransition {
  const next: FactoryJob = Object.freeze({
    ...job,
    revision: job.revision + 1,
    status: input.status,
    stage: input.stage,
    ...(input.plan !== undefined ? { plan: input.plan } : {}),
    ...(input.selectedWorkflowId !== undefined
      ? { selectedWorkflowId: input.selectedWorkflowId }
      : {}),
    ...(input.buildRequest !== undefined ? { buildRequest: input.buildRequest } : {}),
    ...(input.buildArtifact !== undefined ? { buildArtifact: input.buildArtifact } : {}),
    ...(input.diagnostics !== undefined
      ? { diagnostics: Object.freeze([...input.diagnostics]) }
      : {}),
    ...(input.review !== undefined ? { review: Object.freeze({ ...input.review }) } : {}),
    updatedAt: input.now,
  });

  return Object.freeze({
    job: next,
    event: Object.freeze({
      type: input.eventType,
      fromStage: job.stage,
      toStage: next.stage,
      data: Object.freeze({ ...(input.data ?? {}) }),
    }),
  });
}

export function createFactoryJob(input: {
  id: string;
  problem: string;
  now: string;
}): FactoryJob {
  if (!input.id.trim()) throw new Error("Factory job id is required.");
  const problem = normalizedProblem(input.problem);
  return Object.freeze({
    schemaVersion: FACTORY_JOB_SCHEMA_VERSION,
    id: input.id,
    revision: 1,
    status: "queued",
    stage: "intake",
    problem,
    plan: null,
    selectedWorkflowId: null,
    buildRequest: null,
    buildArtifact: null,
    diagnostics: Object.freeze([]),
    review: Object.freeze({
      required: false,
      reason: null,
      approvedAt: null,
    }),
    createdAt: input.now,
    updatedAt: input.now,
  });
}

function planSnapshot(problem: string, availableTools: readonly string[]): FactoryJobPlanSnapshot {
  const plan = planWorkflowFromProblem(problem, availableTools);
  return Object.freeze({
    decision: plan.decision,
    candidateId: plan.candidates[0]?.id ?? null,
    candidates: Object.freeze(
      plan.candidates.map((candidate) =>
        Object.freeze({
          id: candidate.id,
          label: candidate.label,
          publicHref: candidate.publicHref,
          chatExecutable: candidate.chatExecutable,
          matchedTerms: Object.freeze([...candidate.matchedTerms]),
          score: candidate.score,
        }),
      ),
    ),
  });
}

/**
 * Advance exactly one deterministic factory stage.
 *
 * This runner only performs capabilities the repository can currently prove:
 * canonical problem matching and chat certification. It deliberately stops at
 * a review/build boundary for a new template rather than inventing generated
 * code, tests, or publication results.
 */
export function advanceFactoryJob(
  job: FactoryJob,
  availableTools: readonly string[],
  now: string,
): FactoryJobTransition {
  if (job.status === "completed" || job.status === "cancelled" || job.status === "failed") {
    throw new Error(`Factory job ${job.id} cannot advance from ${job.status}.`);
  }
  if (job.status === "awaiting_review") {
    throw new Error(`Factory job ${job.id} requires review before it can advance.`);
  }

  if (job.stage === "intake") {
    return transition(job, {
      status: "running",
      stage: "match",
      eventType: "factory.match.started",
      now,
    });
  }

  if (job.stage === "match") {
    const plan = planSnapshot(job.problem, availableTools);
    const candidate = plan.candidateId;
    if (plan.decision !== "review-existing-workflow" || !candidate) {
      return transition(job, {
        status: "awaiting_review",
        stage: "template_review",
        eventType: "factory.template_review.required",
        plan,
        selectedWorkflowId: candidate,
        diagnostics: [
          diagnostic(
            "TEMPLATE_REVIEW_REQUIRED",
            "No existing chat-certified workflow is a strong enough match. A reviewer must select a family and approve creation of a new reusable template.",
            "warning",
          ),
        ],
        review: {
          required: true,
          reason: "new-template",
          approvedAt: null,
        },
        data: { candidateId: candidate },
        now,
      });
    }

    return transition(job, {
      status: "running",
      stage: "certify",
      eventType: "factory.match.selected",
      plan,
      selectedWorkflowId: candidate,
      diagnostics: [],
      data: { workflowId: candidate },
      now,
    });
  }

  if (job.stage === "certify") {
    if (!job.selectedWorkflowId) {
      return transition(job, {
        status: "failed",
        stage: "certify",
        eventType: "factory.certification.failed",
        diagnostics: [
          diagnostic("WORKFLOW_SELECTION_MISSING", "No workflow was selected for certification."),
        ],
        now,
      });
    }

    const report = canonicalChatFactoryReport(availableTools).find(
      (entry) => entry.id === job.selectedWorkflowId,
    );
    if (!report || !report.chatExecutable) {
      const diagnostics = report?.diagnostics.map((item) =>
        diagnostic(
          "code" in item && typeof item.code === "string" ? item.code : "CERTIFICATION_FAILED",
          "message" in item && typeof item.message === "string"
            ? item.message
            : "Workflow certification failed.",
        ),
      ) ?? [
        diagnostic(
          "CANONICAL_WORKFLOW_MISSING",
          `Selected workflow ${job.selectedWorkflowId} is not present in the canonical factory report.`,
        ),
      ];
      return transition(job, {
        status: "failed",
        stage: "certify",
        eventType: "factory.certification.failed",
        diagnostics,
        now,
      });
    }

    return transition(job, {
      status: "awaiting_review",
      stage: "publication_review",
      eventType: "factory.existing_workflow.ready_for_review",
      diagnostics: [],
      review: {
        required: true,
        reason: "existing-workflow-selection",
        approvedAt: null,
      },
      data: { workflowId: job.selectedWorkflowId },
      now,
    });
  }

  if (
    job.stage === "template_review" ||
    job.stage === "build" ||
    job.stage === "acceptance" ||
    job.stage === "publication_review"
  ) {
    throw new Error(
      `Factory stage ${job.stage} requires an explicit reviewed transition or a build executor.`,
    );
  }

  throw new Error(`Factory job ${job.id} is already complete.`);
}

export function approveFactoryJobReview(
  job: FactoryJob,
  now: string,
  buildRequest?: FactoryBuildRequest,
): FactoryJobTransition {
  if (job.status !== "awaiting_review" || !job.review.required) {
    throw new Error(`Factory job ${job.id} is not awaiting review.`);
  }

  if (job.stage === "publication_review") {
    if (job.buildArtifact) {
      throw new Error(
        "Generated workflow publication requires the publication executor before completion.",
      );
    }
    return transition(job, {
      status: "completed",
      stage: "complete",
      eventType: "factory.existing_workflow.approved",
      review: {
        required: false,
        reason: null,
        approvedAt: now,
      },
      data: { workflowId: job.selectedWorkflowId },
      now,
    });
  }

  if (job.stage === "template_review") {
    if (!buildRequest) {
      throw new Error("Template review requires a reviewed build request.");
    }
    const restoredRequest = restoreBuildRequest(buildRequest);
    if (!restoredRequest) {
      throw new Error("Template review requires a reviewed build request.");
    }
    return transition(job, {
      status: "queued",
      stage: "build",
      eventType: "factory.template_build.approved",
      selectedWorkflowId: `${restoredRequest.sectionId}/${restoredRequest.workflowId}`,
      buildRequest: restoredRequest,
      buildArtifact: null,
      review: {
        required: false,
        reason: null,
        approvedAt: now,
      },
      diagnostics: [
        diagnostic(
          "BUILD_READY",
          "Template review is approved. The local supervised build executor may create an isolated branch and run acceptance checks.",
          "info",
        ),
      ],
      data: { buildRequest: restoredRequest },
      now,
    });
  }

  throw new Error(`Factory review is not supported at stage ${job.stage}.`);
}

export function startFactoryJobBuild(
  job: FactoryJob,
  now: string,
): FactoryJobTransition {
  if (job.stage !== "build" || job.status !== "queued" || !job.buildRequest) {
    throw new Error(`Factory job ${job.id} is not ready for build execution.`);
  }
  return transition(job, {
    status: "running",
    stage: "build",
    eventType: "factory.build.started",
    diagnostics: [],
    data: { buildRequest: job.buildRequest },
    now,
  });
}

export function failFactoryJobBuild(
  job: FactoryJob,
  input: { code: string; message: string; now: string },
): FactoryJobTransition {
  if (job.stage !== "build" || job.status !== "running") {
    throw new Error(`Factory job ${job.id} is not running a build.`);
  }
  return transition(job, {
    status: "failed",
    stage: "build",
    eventType: "factory.build.failed",
    diagnostics: [diagnostic(input.code, input.message)],
    data: { code: input.code },
    now: input.now,
  });
}

export function recordFactoryJobBuildMaterialized(
  job: FactoryJob,
  artifact: FactoryBuildArtifact,
  now: string,
): FactoryJobTransition {
  if (job.stage !== "build" || job.status !== "running" || !job.buildRequest) {
    throw new Error(`Factory job ${job.id} is not running a build.`);
  }
  if (artifact.checks.length !== 0) {
    throw new Error("Materialized build artifact must not contain acceptance checks yet.");
  }
  return transition(job, {
    status: "running",
    stage: "acceptance",
    eventType: "factory.build.materialized",
    buildArtifact: artifact,
    diagnostics: [],
    data: {
      branch: artifact.branch,
      commitSha: artifact.commitSha,
      changedFiles: artifact.changedFiles,
    },
    now,
  });
}

export function recordFactoryJobAcceptance(
  job: FactoryJob,
  input: {
    checks: readonly FactoryBuildCheck[];
    now: string;
  },
): FactoryJobTransition {
  if (job.stage !== "acceptance" || job.status !== "running" || !job.buildArtifact) {
    throw new Error(`Factory job ${job.id} is not awaiting acceptance results.`);
  }
  if (input.checks.length === 0) {
    throw new Error("Factory acceptance requires at least one check result.");
  }

  const artifact = Object.freeze({
    ...job.buildArtifact,
    checks: Object.freeze([...input.checks]),
  });
  const failed = input.checks.filter((item) => !item.ok);
  if (failed.length > 0) {
    return transition(job, {
      status: "failed",
      stage: "acceptance",
      eventType: "factory.acceptance.failed",
      buildArtifact: artifact,
      diagnostics: failed.map((item) =>
        diagnostic("FACTORY_ACCEPTANCE_FAILED", `${item.id}: ${item.summary}`),
      ),
      data: { failedCheckIds: failed.map((item) => item.id) },
      now: input.now,
    });
  }

  return transition(job, {
    status: "awaiting_review",
    stage: "publication_review",
    eventType: "factory.acceptance.passed",
    buildArtifact: artifact,
    diagnostics: [],
    review: {
      required: true,
      reason: "generated-workflow-publication",
      approvedAt: null,
    },
    data: {
      branch: artifact.branch,
      commitSha: artifact.commitSha,
      checkIds: input.checks.map((item) => item.id),
    },
    now: input.now,
  });
}

export function cancelFactoryJob(
  job: FactoryJob,
  now: string,
): FactoryJobTransition {
  if (job.status === "completed" || job.status === "cancelled") {
    throw new Error(`Factory job ${job.id} cannot be cancelled from ${job.status}.`);
  }
  return transition(job, {
    status: "cancelled",
    stage: job.stage,
    eventType: "factory.job.cancelled",
    now,
  });
}

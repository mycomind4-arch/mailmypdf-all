import { canonicalChatFactoryReport } from "./chat-execution-registry.js";
import { workflowById } from "./canonical-workflow-registry.js";
import { planWorkflowFromProblem } from "./problem-workflow-plan.js";
import {
  buildReviewedFactoryTemplatePlan,
  type ReviewedFactoryTemplateRequest,
} from "./factory-build.js";

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

export type FactoryPublicationArtifact = Readonly<{
  repository: string;
  branch: string;
  commitSha: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  publishedAt: string;
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

export type FactoryJobBuildSnapshot = Readonly<{
  request: ReviewedFactoryTemplateRequest;
  canonicalId: string;
  sectionId: string;
  slug: string;
  filePaths: readonly string[];
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
  build: FactoryJobBuildSnapshot | null;
  buildArtifact: FactoryBuildArtifact | null;
  publicationArtifact: FactoryPublicationArtifact | null;
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

function restoreBuildArtifact(value: unknown): FactoryBuildArtifact | null {
  if (value === undefined || value === null) return null;
  const source = record(value, "Factory build artifact");
  if (
    !Array.isArray(source.changedFiles) ||
    source.changedFiles.some((item) => typeof item !== "string")
  ) {
    throw new Error("Factory build changed files are invalid.");
  }
  if (!Array.isArray(source.checks) || source.checks.length > 50) {
    throw new Error("Factory build checks are invalid.");
  }
  const checks = source.checks.map((entry) => {
    const item = record(entry, "Factory build check");
    if (typeof item.ok !== "boolean") {
      throw new Error("Factory build check status is invalid.");
    }
    return Object.freeze({
      id: requiredSnapshotString(item.id, "Factory build check id", 200),
      command: requiredSnapshotString(item.command, "Factory build check command", 1000),
      ok: item.ok,
      summary: requiredSnapshotString(item.summary, "Factory build check summary", 4000),
    });
  });
  const builtAt = requiredSnapshotString(
    source.builtAt,
    "Factory build timestamp",
    100,
  );
  if (!Number.isFinite(Date.parse(builtAt))) {
    throw new Error("Factory build timestamp is invalid.");
  }
  return Object.freeze({
    branch: requiredSnapshotString(source.branch, "Factory build branch", 300),
    baseSha: requiredSnapshotString(source.baseSha, "Factory build base sha", 100),
    commitSha: requiredSnapshotString(source.commitSha, "Factory build commit sha", 100),
    specPath: requiredSnapshotString(source.specPath, "Factory build spec path", 1000),
    profileRegistryPath: requiredSnapshotString(
      source.profileRegistryPath,
      "Factory build profile path",
      1000,
    ),
    configPath: requiredSnapshotString(source.configPath, "Factory build config path", 1000),
    changedFiles: Object.freeze([...source.changedFiles] as string[]),
    checks: Object.freeze(checks),
    builtAt,
  });
}

function restorePublicationArtifact(value: unknown): FactoryPublicationArtifact | null {
  if (value === undefined || value === null) return null;
  const source = record(value, "Factory publication artifact");
  const pullRequestNumber = source.pullRequestNumber;
  if (
    typeof pullRequestNumber !== "number" ||
    !Number.isSafeInteger(pullRequestNumber) ||
    pullRequestNumber < 1
  ) {
    throw new Error("Factory publication pull request number is invalid.");
  }
  const publishedAt = requiredSnapshotString(
    source.publishedAt,
    "Factory publication timestamp",
    100,
  );
  if (!Number.isFinite(Date.parse(publishedAt))) {
    throw new Error("Factory publication timestamp is invalid.");
  }
  return Object.freeze({
    repository: requiredSnapshotString(source.repository, "Factory publication repository", 300),
    branch: requiredSnapshotString(source.branch, "Factory publication branch", 300),
    commitSha: requiredSnapshotString(source.commitSha, "Factory publication commit sha", 100),
    pullRequestNumber,
    pullRequestUrl: requiredSnapshotString(source.pullRequestUrl, "Factory publication pull request URL", 2000),
    publishedAt,
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

function restoreBuild(value: unknown): FactoryJobBuildSnapshot | null {
  if (value === null || value === undefined) return null;
  const source = record(value, "Factory job build");
  const request = record(source.request, "Factory job build request");
  const startTemplate = request.startTemplate;
  if (startTemplate !== "notice-response" && startTemplate !== "records-request") {
    throw new Error("Factory job build start template is invalid.");
  }
  if (!Array.isArray(source.filePaths) || source.filePaths.some((path) => typeof path !== "string")) {
    throw new Error("Factory job build file paths are invalid.");
  }

  const reviewedRequest: ReviewedFactoryTemplateRequest = Object.freeze({
    id: requiredSnapshotString(request.id, "Factory build workflow id", 300),
    label: requiredSnapshotString(request.label, "Factory build workflow label", 500),
    startTemplate,
    ...(request.authority &&
    typeof request.authority === "object" &&
    !Array.isArray(request.authority) &&
    typeof (request.authority as Record<string, unknown>).module === "string" &&
    typeof (request.authority as Record<string, unknown>).reviewedAt === "string"
      ? {
          authority: {
            module: (request.authority as Record<string, unknown>).module as string,
            reviewedAt: (request.authority as Record<string, unknown>).reviewedAt as string,
          },
        }
      : {}),
    ...(typeof request.legacyGoldId === "string" && request.legacyGoldId
      ? { legacyGoldId: request.legacyGoldId }
      : {}),
    ...(request.adoptExisting === true ? { adoptExisting: true } : {}),
    ...(request.noticeProfile !== undefined
      ? {
          noticeProfile:
            request.noticeProfile as NonNullable<
              ReviewedFactoryTemplateRequest["noticeProfile"]
            >,
        }
      : {}),
  });
  const rebuilt = buildReviewedFactoryTemplatePlan(reviewedRequest);
  const filePaths = source.filePaths as string[];
  if (
    source.canonicalId !== rebuilt.canonicalId ||
    source.sectionId !== rebuilt.sectionId ||
    source.slug !== rebuilt.slug ||
    filePaths.length !== rebuilt.filePaths.length ||
    filePaths.some((path, index) => path !== rebuilt.filePaths[index])
  ) {
    throw new Error("Factory job build snapshot does not match deterministic materialization.");
  }

  return Object.freeze({
    request: rebuilt.request,
    canonicalId: rebuilt.canonicalId,
    sectionId: rebuilt.sectionId,
    slug: rebuilt.slug,
    filePaths: Object.freeze([...rebuilt.filePaths]),
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
    build: restoreBuild(source.build),
    buildArtifact: restoreBuildArtifact(source.buildArtifact),
    publicationArtifact: restorePublicationArtifact(source.publicationArtifact),
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
    build?: FactoryJobBuildSnapshot | null;
    buildArtifact?: FactoryBuildArtifact | null;
    publicationArtifact?: FactoryPublicationArtifact | null;
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
    ...(input.build !== undefined ? { build: input.build } : {}),
    ...(input.buildArtifact !== undefined ? { buildArtifact: input.buildArtifact } : {}),
    ...(input.publicationArtifact !== undefined
      ? { publicationArtifact: input.publicationArtifact }
      : {}),
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
    build: null,
    buildArtifact: null,
    publicationArtifact: null,
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

  if (job.stage === "build") {
    if (!job.build) {
      return transition(job, {
        status: "failed",
        stage: "build",
        eventType: "factory.template_build.failed",
        diagnostics: [
          diagnostic("BUILD_RECIPE_MISSING", "Approved template build is missing its reviewed build recipe."),
        ],
        now,
      });
    }
    const rebuilt = buildReviewedFactoryTemplatePlan(job.build.request);
    return transition(job, {
      status: "queued",
      stage: "acceptance",
      eventType: "factory.template_build.materialized",
      build: Object.freeze({
        request: rebuilt.request,
        canonicalId: rebuilt.canonicalId,
        sectionId: rebuilt.sectionId,
        slug: rebuilt.slug,
        filePaths: Object.freeze([...rebuilt.filePaths]),
      }),
      selectedWorkflowId: rebuilt.canonicalId,
      diagnostics: [
        diagnostic(
          "ACCEPTANCE_EXECUTOR_REQUIRED",
          "Reviewed workflow spec and deterministic materialization plan are ready. The next factory slice must run isolated branch materialization and acceptance checks.",
          "info",
        ),
      ],
      data: {
        workflowId: rebuilt.canonicalId,
        filePaths: [...rebuilt.filePaths],
      },
      now,
    });
  }

  if (
    job.stage === "template_review" ||
    job.stage === "acceptance" ||
    job.stage === "publication_review"
  ) {
    throw new Error(
      `Factory stage ${job.stage} requires an explicit reviewed transition or an acceptance executor.`,
    );
  }

  throw new Error(`Factory job ${job.id} is already complete.`);
}

export function approveFactoryJobReview(
  job: FactoryJob,
  now: string,
  templateRequest?: ReviewedFactoryTemplateRequest,
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
    if (!templateRequest) {
      throw new Error("Template review approval requires a reviewed workflow id, label, and supported family.");
    }
    if (
      templateRequest.startTemplate === "notice-response" &&
      !templateRequest.noticeProfile
    ) {
      throw new Error(
        "Notice Respond template approval requires a reviewer-authored noticeProfile.",
      );
    }

    const requestedId = templateRequest.id.trim();
    const canonical = workflowById(requestedId);
    let reviewedRequest = templateRequest;

    if (templateRequest.adoptExisting) {
      if (!canonical) {
        throw new Error(
          `Catalog adoption requires an existing canonical workflow: ${requestedId}.`,
        );
      }
      if (canonical.execution) {
        throw new Error(
          `Canonical workflow ${requestedId} is already executable and cannot be adopted again.`,
        );
      }
      if (templateRequest.label.trim() !== canonical.label) {
        throw new Error(
          `Catalog adoption label must match canonical label "${canonical.label}".`,
        );
      }
      reviewedRequest = Object.freeze({
        ...templateRequest,
        id: canonical.id,
        label: canonical.label,
        adoptExisting: true,
        ...(canonical.authority ? { authority: canonical.authority } : {}),
        ...(canonical.legacyGoldId ? { legacyGoldId: canonical.legacyGoldId } : {}),
      });
    } else if (canonical) {
      throw new Error(
        `Canonical workflow ${requestedId} already exists. Use the reviewed catalog-adoption path instead of creating a duplicate.`,
      );
    }

    const build = buildReviewedFactoryTemplatePlan(reviewedRequest);
    return transition(job, {
      status: "queued",
      stage: "build",
      eventType: "factory.template_build.approved",
      selectedWorkflowId: build.canonicalId,
      build: Object.freeze({
        request: build.request,
        canonicalId: build.canonicalId,
        sectionId: build.sectionId,
        slug: build.slug,
        filePaths: Object.freeze([...build.filePaths]),
      }),
      review: {
        required: false,
        reason: null,
        approvedAt: now,
      },
      diagnostics: [
        diagnostic(
          "BUILD_RECIPE_READY",
          `Reviewed ${build.request.startTemplate} build recipe is ready for deterministic materialization.`,
          "info",
        ),
      ],
      data: {
        workflowId: build.canonicalId,
        startTemplate: build.request.startTemplate,
        filePaths: [...build.filePaths],
      },
      now,
    });
  }

  throw new Error(`Factory review is not supported at stage ${job.stage}.`);
}

export function startFactoryJobAcceptance(
  job: FactoryJob,
  now: string,
): FactoryJobTransition {
  if (job.stage !== "acceptance" || job.status !== "queued" || !job.build) {
    throw new Error(`Factory job ${job.id} is not ready for supervised acceptance execution.`);
  }
  return transition(job, {
    status: "running",
    stage: "acceptance",
    eventType: "factory.acceptance.started",
    buildArtifact: null,
    diagnostics: [],
    data: {
      workflowId: job.build.canonicalId,
      filePaths: [...job.build.filePaths],
    },
    now,
  });
}

export function recordFactoryJobBuildArtifact(
  job: FactoryJob,
  artifact: FactoryBuildArtifact,
  now: string,
): FactoryJobTransition {
  if (job.stage !== "acceptance" || job.status !== "running" || !job.build) {
    throw new Error(`Factory job ${job.id} is not running supervised acceptance.`);
  }
  if (artifact.checks.length !== 0) {
    throw new Error("Initial build artifact must not contain acceptance checks.");
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
      changedFiles: [...artifact.changedFiles],
    },
    now,
  });
}

export function failFactoryJobAcceptance(
  job: FactoryJob,
  input: { code: string; message: string; now: string },
): FactoryJobTransition {
  if (job.stage !== "acceptance" || job.status !== "running") {
    throw new Error(`Factory job ${job.id} is not running supervised acceptance.`);
  }
  return transition(job, {
    status: "failed",
    stage: "acceptance",
    eventType: "factory.acceptance.failed",
    diagnostics: [diagnostic(input.code, input.message)],
    data: { code: input.code },
    now: input.now,
  });
}

export function recordFactoryJobAcceptance(
  job: FactoryJob,
  input: {
    checks: readonly FactoryBuildCheck[];
    now: string;
  },
): FactoryJobTransition {
  if (
    job.stage !== "acceptance" ||
    job.status !== "running" ||
    !job.build ||
    !job.buildArtifact
  ) {
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

export function recordFactoryJobPublication(
  job: FactoryJob,
  artifact: FactoryPublicationArtifact,
  now: string,
): FactoryJobTransition {
  if (
    job.stage !== "publication_review" ||
    job.status !== "awaiting_review" ||
    job.review.reason !== "generated-workflow-publication" ||
    !job.buildArtifact
  ) {
    throw new Error(
      `Factory job ${job.id} is not ready to publish a generated workflow proposal.`,
    );
  }
  if (job.buildArtifact.checks.length === 0 || job.buildArtifact.checks.some((check) => !check.ok)) {
    throw new Error("Generated workflow publication requires complete passing acceptance evidence.");
  }
  if (
    artifact.branch !== job.buildArtifact.branch ||
    artifact.commitSha !== job.buildArtifact.commitSha
  ) {
    throw new Error("Factory publication artifact does not match the accepted proposal commit.");
  }

  return transition(job, {
    status: "completed",
    stage: "complete",
    eventType: "factory.generated_workflow.pull_request_created",
    publicationArtifact: Object.freeze({ ...artifact }),
    diagnostics: [],
    review: {
      required: false,
      reason: null,
      approvedAt: now,
    },
    data: {
      repository: artifact.repository,
      branch: artifact.branch,
      commitSha: artifact.commitSha,
      pullRequestNumber: artifact.pullRequestNumber,
      pullRequestUrl: artifact.pullRequestUrl,
    },
    now,
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

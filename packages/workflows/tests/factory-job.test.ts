import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceFactoryJob,
  approveFactoryJobReview,
  cancelFactoryJob,
  createFactoryJob,
  recordFactoryJobAcceptance,
  recordFactoryJobBuildArtifact,
  recordFactoryJobPublication,
  restoreFactoryJobSnapshot,
  startFactoryJobAcceptance,
} from "../src/factory-job.js";

const TOOLS = [
  "create_matter",
  "get_workflow_state",
  "save_matter_input",
  "ingest_document",
  "get_document_status",
  "analyze_matter",
  "generate_draft",
  "save_draft",
  "preview_packet",
  "approve_packet",
  "prepare_checkout",
  "get_order_status",
];

test("factory job persists deterministic stage-by-stage progress for an existing certified workflow", () => {
  let job = createFactoryJob({
    id: "job-1",
    problem: "I received an IRS CP14 notice and need to respond.",
    now: "2026-09-30T20:00:00.000Z",
  });
  assert.equal(job.status, "queued");
  assert.equal(job.stage, "intake");

  let next = advanceFactoryJob(job, TOOLS, "2026-09-30T20:01:00.000Z");
  job = next.job;
  assert.equal(job.stage, "match");
  assert.equal(job.status, "running");

  next = advanceFactoryJob(job, TOOLS, "2026-09-30T20:02:00.000Z");
  job = next.job;
  assert.equal(job.stage, "certify");
  assert.equal(job.selectedWorkflowId, "notice-respond/cp14-response");

  next = advanceFactoryJob(job, TOOLS, "2026-09-30T20:03:00.000Z");
  job = next.job;
  assert.equal(job.stage, "publication_review");
  assert.equal(job.status, "awaiting_review");
  assert.equal(job.review.required, true);

  next = approveFactoryJobReview(job, "2026-09-30T20:04:00.000Z");
  job = next.job;
  assert.equal(job.status, "completed");
  assert.equal(job.stage, "complete");
});

test("factory job stops at a reviewed template boundary instead of inventing a build", () => {
  let job = createFactoryJob({
    id: "job-2",
    problem: "Create a completely novel mars colony easement workflow.",
    now: "2026-09-30T20:00:00.000Z",
  });

  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:02:00.000Z").job;

  assert.equal(job.status, "awaiting_review");
  assert.equal(job.stage, "template_review");
  assert.ok(job.diagnostics.some((item) => item.code === "TEMPLATE_REVIEW_REQUIRED"));

  assert.throws(
    () => approveFactoryJobReview(job, "2026-09-30T20:03:00.000Z"),
    /requires a reviewed workflow id/i,
  );

  job = approveFactoryJobReview(
    job,
    "2026-09-30T20:03:00.000Z",
    {
      id: "records-request/mars-colony-records",
      label: "Mars Colony Records Request",
      startTemplate: "records-request",
    },
  ).job;
  assert.equal(job.status, "queued");
  assert.equal(job.stage, "build");
  assert.equal(job.build?.canonicalId, "records-request/mars-colony-records");
  assert.ok(job.diagnostics.some((item) => item.code === "BUILD_RECIPE_READY"));

  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:04:00.000Z").job;
  assert.equal(job.status, "queued");
  assert.equal(job.stage, "acceptance");
  assert.equal(job.selectedWorkflowId, "records-request/mars-colony-records");
  assert.ok(job.build?.filePaths.some((path) => path.endsWith("/start/index.tsx")));
  assert.ok(job.diagnostics.some((item) => item.code === "ACCEPTANCE_EXECUTOR_REQUIRED"));
  assert.throws(
    () => advanceFactoryJob(job, TOOLS, "2026-09-30T20:05:00.000Z"),
    /acceptance executor/i,
  );
});

test("factory certification fails closed when the selected workflow loses a required connector tool", () => {
  let job = createFactoryJob({
    id: "job-3",
    problem: "IRS CP14 notice response",
    now: "2026-09-30T20:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:02:00.000Z").job;

  const toolsWithoutPreview = TOOLS.filter((tool) => tool !== "preview_packet");
  job = advanceFactoryJob(job, toolsWithoutPreview, "2026-09-30T20:03:00.000Z").job;

  assert.equal(job.status, "failed");
  assert.equal(job.stage, "certify");
  assert.ok(job.diagnostics.some((item) => item.code === "CONNECTOR_TOOL_MISSING"));
});

test("factory jobs can be cancelled before completion", () => {
  const job = createFactoryJob({
    id: "job-4",
    problem: "public records request",
    now: "2026-09-30T20:00:00.000Z",
  });
  const cancelled = cancelFactoryJob(job, "2026-09-30T20:01:00.000Z").job;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.stage, "intake");
});


test("durable factory snapshots round-trip and corrupted state fails closed", () => {
  const original = createFactoryJob({
    id: "job-round-trip",
    problem: "IRS CP14 response",
    now: "2026-09-30T20:00:00.000Z",
  });
  const restored = restoreFactoryJobSnapshot(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored, original);

  assert.throws(
    () => restoreFactoryJobSnapshot({ ...original, revision: 0 }),
    /revision is invalid/i,
  );
  assert.throws(
    () => restoreFactoryJobSnapshot({ ...original, schemaVersion: "future-version" }),
    /schema version is unsupported/i,
  );
});


test("supervised acceptance persists build evidence and stops at publication review", () => {
  let job = createFactoryJob({
    id: "job-supervised-build",
    problem: "Create a completely novel mars colony easement workflow.",
    now: "2026-09-30T21:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T21:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T21:02:00.000Z").job;
  job = approveFactoryJobReview(job, "2026-09-30T21:03:00.000Z", {
    id: "records-request/mars-colony-records-request",
    label: "Mars Colony Records Request",
    startTemplate: "records-request",
  }).job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T21:04:00.000Z").job;

  job = startFactoryJobAcceptance(job, "2026-09-30T21:05:00.000Z").job;
  assert.equal(job.stage, "acceptance");
  assert.equal(job.status, "running");

  job = recordFactoryJobBuildArtifact(
    job,
    {
      branch: "factory/job-supervised-mars-colony-records-request",
      baseSha: "a".repeat(40),
      commitSha: "b".repeat(40),
      specPath: "records-request/workflows/mars-colony-records-request/workflow.spec.json",
      profileRegistryPath: "packages/workflows/src/domain-packs/records-request/generated-profile-specs.json",
      configPath: "records-request/workflows/mars-colony-records-request/config.ts",
      changedFiles: [
        "records-request/workflows/mars-colony-records-request/config.ts",
      ],
      checks: [],
      builtAt: "2026-09-30T21:06:00.000Z",
    },
    "2026-09-30T21:06:00.000Z",
  ).job;

  job = recordFactoryJobAcceptance(job, {
    checks: [
      {
        id: "generated-workflow-certification",
        command: "verify-factory-workflow records-request/mars-colony-records-request",
        ok: true,
        summary: "chat certified",
      },
      {
        id: "records-request-acceptance",
        command: "pnpm --filter @mailmypdf/records-request test:acceptance",
        ok: true,
        summary: "acceptance passed",
      },
    ],
    now: "2026-09-30T21:07:00.000Z",
  }).job;

  assert.equal(job.stage, "publication_review");
  assert.equal(job.status, "awaiting_review");
  assert.equal(job.review.reason, "generated-workflow-publication");
  assert.equal(job.buildArtifact?.checks.length, 2);
  assert.throws(
    () => approveFactoryJobReview(job, "2026-09-30T21:08:00.000Z"),
    /publication executor/i,
  );

  assert.throws(
    () =>
      recordFactoryJobPublication(
        job,
        {
          repository: "mycomind4-arch/mailmypdf-all",
          branch: "factory/wrong-branch",
          commitSha: "b".repeat(40),
          pullRequestNumber: 200,
          pullRequestUrl: "https://github.com/mycomind4-arch/mailmypdf-all/pull/200",
          publishedAt: "2026-09-30T21:08:00.000Z",
        },
        "2026-09-30T21:08:00.000Z",
      ),
    /does not match the accepted proposal commit/,
  );

  job = recordFactoryJobPublication(
    job,
    {
      repository: "mycomind4-arch/mailmypdf-all",
      branch: "factory/job-supervised-mars-colony-records-request",
      commitSha: "b".repeat(40),
      pullRequestNumber: 200,
      pullRequestUrl: "https://github.com/mycomind4-arch/mailmypdf-all/pull/200",
      publishedAt: "2026-09-30T21:08:00.000Z",
    },
    "2026-09-30T21:08:00.000Z",
  ).job;

  assert.equal(job.stage, "complete");
  assert.equal(job.status, "completed");
  assert.equal(job.publicationArtifact?.pullRequestNumber, 200);
  assert.equal(job.review.required, false);

  const restored = restoreFactoryJobSnapshot(JSON.parse(JSON.stringify(job)));
  assert.deepEqual(restored, job);
});

test("failed supervised acceptance fails the durable Factory Job", () => {
  let job = createFactoryJob({
    id: "job-supervised-fail",
    problem: "Create a completely novel mars colony easement workflow.",
    now: "2026-09-30T21:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T21:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T21:02:00.000Z").job;
  job = approveFactoryJobReview(job, "2026-09-30T21:03:00.000Z", {
    id: "records-request/mars-colony-records-request",
    label: "Mars Colony Records Request",
    startTemplate: "records-request",
  }).job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T21:04:00.000Z").job;
  job = startFactoryJobAcceptance(job, "2026-09-30T21:05:00.000Z").job;
  job = recordFactoryJobBuildArtifact(
    job,
    {
      branch: "factory/job-fail-mars-colony-records-request",
      baseSha: "a".repeat(40),
      commitSha: "b".repeat(40),
      specPath: "spec.json",
      profileRegistryPath: "profiles.json",
      configPath: "config.ts",
      changedFiles: ["config.ts"],
      checks: [],
      builtAt: "2026-09-30T21:06:00.000Z",
    },
    "2026-09-30T21:06:00.000Z",
  ).job;
  job = recordFactoryJobAcceptance(job, {
    checks: [
      {
        id: "acceptance",
        command: "test",
        ok: false,
        summary: "scenario failed",
      },
    ],
    now: "2026-09-30T21:07:00.000Z",
  }).job;

  assert.equal(job.status, "failed");
  assert.equal(job.stage, "acceptance");
  assert.ok(job.diagnostics.some((item) => item.code === "FACTORY_ACCEPTANCE_FAILED"));
});


test("pre-executor v1 Factory Job snapshots restore with no build artifact", () => {
  const original = createFactoryJob({
    id: "job-legacy-v1",
    problem: "public records request",
    now: "2026-09-30T21:00:00.000Z",
  });
  const serialized = JSON.parse(JSON.stringify(original)) as Record<string, unknown>;
  delete serialized.buildArtifact;
  delete serialized.publicationArtifact;

  const restored = restoreFactoryJobSnapshot(serialized);
  assert.equal(restored.buildArtifact, null);
  assert.equal(restored.publicationArtifact, null);
  assert.equal(restored.schemaVersion, "mailmypdf.factory-job/v1");
});


test("reviewed Notice Respond profile survives durable Factory Job restoration", () => {
  const noticeProfile = {
    domain: "tax",
    noticeLabel: "State tax balance notice",
    primaryDocumentId: "state-tax-balance-notice",
    primaryDocumentLabel: "State tax balance notice",
    extractionSchema: "state.tax.balance.v1",
    sourcePurpose: "state_tax_balance_notice",
    responseModeLabel: "How do you want to respond?",
    responseModes: [
      { value: "agree", label: "Agree" },
      { value: "disagree", label: "Disagree" },
    ],
    evidenceKinds: [{ value: "other", label: "Supporting record" }],
    explanationRequiredModes: ["disagree"],
    explanationLabel: "Explain your response",
    explanationHint: "Use verified facts only.",
    requestedActionDefault: "Please review my response.",
    analysisInstructions: "Extract notice-supported facts only. Do not invent deadlines or addresses.",
    draftInstructions: "Draft only from verified notice facts and user-confirmed facts.",
  } as const;

  let job = createFactoryJob({
    id: "job-notice-profile",
    problem: "Create a state tax balance notice response workflow.",
    now: "2026-10-01T03:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-10-01T03:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-10-01T03:02:00.000Z").job;
  job = approveFactoryJobReview(job, "2026-10-01T03:03:00.000Z", {
    id: "notice-respond/state-tax-balance-response",
    label: "State Tax Balance Notice Response",
    startTemplate: "notice-response",
    noticeProfile,
  }).job;

  const restored = restoreFactoryJobSnapshot(JSON.parse(JSON.stringify(job)));
  assert.deepEqual(restored.build?.request.noticeProfile, noticeProfile);
});


test("new Notice Respond template approval fails closed without a reviewed profile", () => {
  let job = createFactoryJob({
    id: "job-notice-profile-required",
    problem: "Create a new state tax notice response workflow.",
    now: "2026-10-01T04:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-10-01T04:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-10-01T04:02:00.000Z").job;

  assert.throws(
    () =>
      approveFactoryJobReview(job, "2026-10-01T04:03:00.000Z", {
        id: "notice-respond/state-tax-balance-response",
        label: "State Tax Balance Notice Response",
        startTemplate: "notice-response",
      }),
    /requires a reviewer-authored noticeProfile/,
  );
});


function templateReviewJob(id: string, problem = "Create a completely novel mars colony easement workflow.") {
  let job = createFactoryJob({
    id,
    problem,
    now: "2026-10-02T05:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-10-02T05:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-10-02T05:02:00.000Z").job;
  assert.equal(job.stage, "template_review");
  return job;
}

test("catalog Records Request workflow can be adopted in place", () => {
  let job = templateReviewJob(
    "job-adopt-police-records",
    "I need a police records request workflow that is not yet executable.",
  );

  job = approveFactoryJobReview(job, "2026-10-02T05:03:00.000Z", {
    id: "records-request/police-records-request",
    label: "Police Records Request",
    startTemplate: "records-request",
    adoptExisting: true,
  }).job;

  assert.equal(job.stage, "build");
  assert.equal(job.build?.canonicalId, "records-request/police-records-request");
  assert.equal(job.build?.request.adoptExisting, true);

  const restored = restoreFactoryJobSnapshot(JSON.parse(JSON.stringify(job)));
  assert.equal(restored.build?.request.adoptExisting, true);
});

test("catalog adoption preserves canonical legacy metadata", () => {
  const job = templateReviewJob("job-adopt-follow-up");
  const approved = approveFactoryJobReview(job, "2026-10-02T05:03:00.000Z", {
    id: "records-request/records-follow-up-request",
    label: "Records Follow Up Request",
    startTemplate: "records-request",
    adoptExisting: true,
  }).job;

  assert.equal(approved.build?.request.legacyGoldId, "records/follow-up");
});

test("catalog adoption preserves canonical authority metadata for reviewed tax notices", () => {
  const job = templateReviewJob("job-adopt-irs-notice");
  const approved = approveFactoryJobReview(job, "2026-10-02T05:03:00.000Z", {
    id: "notice-respond/irs-notice-response",
    label: "IRS Notice Response",
    startTemplate: "notice-response",
    adoptExisting: true,
    noticeProfile: {
      domain: "tax",
      noticeLabel: "IRS notice",
      primaryDocumentId: "irs-notice",
      primaryDocumentLabel: "IRS notice",
      extractionSchema: "irs.notice.v1",
      sourcePurpose: "irs_notice",
      responseModeLabel: "How do you want to respond?",
      responseModes: [{ value: "other", label: "Send a documented response" }],
      evidenceKinds: [{ value: "other", label: "Supporting record" }],
      explanationRequiredModes: ["other"],
      explanationLabel: "Explain your response",
      explanationHint: "Use verified notice and user-confirmed facts only.",
      requestedActionDefault: "Please review my response and supporting records.",
      analysisInstructions: "Extract only notice-supported facts. Do not invent deadlines or addresses.",
      draftInstructions: "Draft only from verified notice facts and user-confirmed facts.",
    },
  }).job;

  assert.deepEqual(approved.build?.request.authority, {
    module: "notice-irs-notice",
    reviewedAt: "2026-09-21",
  });
  assert.equal(approved.build?.request.legacyGoldId, "notice/irs-notice");
});

test("new-template creation refuses an existing canonical id and directs review to adoption", () => {
  const job = templateReviewJob("job-duplicate-canonical");

  assert.throws(
    () =>
      approveFactoryJobReview(job, "2026-10-02T05:03:00.000Z", {
        id: "records-request/police-records-request",
        label: "Police Records Request",
        startTemplate: "records-request",
      }),
    /already exists.*catalog-adoption/i,
  );
});

test("catalog adoption refuses a workflow that is already executable", () => {
  const job = templateReviewJob("job-adopt-executable");

  assert.throws(
    () =>
      approveFactoryJobReview(job, "2026-10-02T05:03:00.000Z", {
        id: "records-request/public-records-request",
        label: "Public Records Request",
        startTemplate: "records-request",
        adoptExisting: true,
      }),
    /already executable/i,
  );
});


test("durable adoption snapshot rejects corrupted adoption metadata", () => {
  let job = templateReviewJob("job-adopt-corrupt");
  job = approveFactoryJobReview(job, "2026-10-02T05:03:00.000Z", {
    id: "records-request/police-records-request",
    label: "Police Records Request",
    startTemplate: "records-request",
    adoptExisting: true,
  }).job;

  const serialized = JSON.parse(JSON.stringify(job)) as {
    build: { request: Record<string, unknown> };
  };
  serialized.build.request.adoptExisting = "yes";

  assert.throws(
    () => restoreFactoryJobSnapshot(serialized),
    /adoption flag is invalid/i,
  );
});


test("pre-adoption plan snapshots restore candidate adoption status conservatively", () => {
  let job = createFactoryJob({
    id: "job-old-plan",
    problem: "IRS CP14 response",
    now: "2026-10-02T06:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-10-02T06:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-10-02T06:02:00.000Z").job;

  const serialized = JSON.parse(JSON.stringify(job)) as {
    plan: { candidates: Array<Record<string, unknown>> };
  };
  for (const candidate of serialized.plan.candidates) {
    delete candidate.adoptable;
  }

  const restored = restoreFactoryJobSnapshot(serialized);
  assert.ok(restored.plan?.candidates.length);
  assert.ok(restored.plan?.candidates.every((candidate) => candidate.adoptable === false));
});


test("durable Factory Job snapshots preserve remote PR build evidence", () => {
  let job = templateReviewJob("job-remote-artifact");
  job = approveFactoryJobReview(job, "2026-10-02T07:03:00.000Z", {
    id: "records-request/remote-artifact-records-request",
    label: "Remote Artifact Records Request",
    startTemplate: "records-request",
  }).job;
  job = advanceFactoryJob(job, TOOLS, "2026-10-02T07:04:00.000Z").job;
  job = startFactoryJobAcceptance(job, "2026-10-02T07:05:00.000Z").job;
  job = recordFactoryJobBuildArtifact(
    job,
    {
      branch: "factory/remote-job-remote-artifact",
      baseSha: "a".repeat(40),
      commitSha: "b".repeat(40),
      specPath:
        "records-request/workflows/remote-artifact-records-request/workflow.spec.json",
      profileRegistryPath:
        "packages/workflows/src/domain-packs/records-request/generated-profile-specs.json",
      configPath:
        "records-request/workflows/remote-artifact-records-request/config.ts",
      changedFiles: ["records-request/workflows/remote-artifact-records-request/config.ts"],
      checks: [],
      builtAt: "2026-10-02T07:06:00.000Z",
      remote: {
        repository: "mycomind4-arch/mailmypdf-all",
        pullRequestNumber: 999,
        pullRequestUrl: "https://github.com/mycomind4-arch/mailmypdf-all/pull/999",
      },
    },
    "2026-10-02T07:06:00.000Z",
  ).job;

  const restored = restoreFactoryJobSnapshot(JSON.parse(JSON.stringify(job)));
  assert.deepEqual(restored, job);
  assert.equal(restored.buildArtifact?.remote?.pullRequestNumber, 999);

  const corrupt = JSON.parse(JSON.stringify(job)) as {
    buildArtifact: { remote: { pullRequestNumber: unknown } };
  };
  corrupt.buildArtifact.remote.pullRequestNumber = 0;
  assert.throws(
    () => restoreFactoryJobSnapshot(corrupt),
    /remote build pull request number is invalid/i,
  );
});

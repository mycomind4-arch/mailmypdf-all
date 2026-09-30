import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceFactoryJob,
  approveFactoryJobReview,
  cancelFactoryJob,
  createFactoryJob,
  recordFactoryJobAcceptance,
  recordFactoryJobBuildMaterialized,
  restoreFactoryJobSnapshot,
  startFactoryJobBuild,
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

test("factory job requires a reviewed build request before entering build", () => {
  let job = createFactoryJob({
    id: "job-2",
    problem: "Create a completely novel records request workflow.",
    now: "2026-09-30T20:00:00.000Z",
  });

  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:02:00.000Z").job;

  assert.equal(job.status, "awaiting_review");
  assert.equal(job.stage, "template_review");
  assert.throws(
    () => approveFactoryJobReview(job, "2026-09-30T20:03:00.000Z"),
    /reviewed build request/i,
  );

  job = approveFactoryJobReview(
    job,
    "2026-09-30T20:03:00.000Z",
    {
      family: "records-request",
      sectionId: "records-request",
      workflowId: "police-incident-records-request",
      label: "Police Incident Records Request",
      startTemplate: "records-request",
    },
  ).job;

  assert.equal(job.status, "queued");
  assert.equal(job.stage, "build");
  assert.equal(job.selectedWorkflowId, "records-request/police-incident-records-request");
  assert.equal(job.buildRequest?.workflowId, "police-incident-records-request");
  assert.ok(job.diagnostics.some((item) => item.code === "BUILD_READY"));
  assert.throws(
    () => advanceFactoryJob(job, TOOLS, "2026-09-30T20:04:00.000Z"),
    /build executor/i,
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


test("supervised build transitions materialization through acceptance to publication review", () => {
  let job = createFactoryJob({
    id: "job-build",
    problem: "Create a new police incident records request workflow.",
    now: "2026-09-30T20:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:02:00.000Z").job;
  job = approveFactoryJobReview(
    job,
    "2026-09-30T20:03:00.000Z",
    {
      family: "records-request",
      sectionId: "records-request",
      workflowId: "police-incident-records-request",
      label: "Police Incident Records Request",
      startTemplate: "records-request",
    },
  ).job;

  job = startFactoryJobBuild(job, "2026-09-30T20:04:00.000Z").job;
  assert.equal(job.status, "running");
  assert.equal(job.stage, "build");

  job = recordFactoryJobBuildMaterialized(
    job,
    {
      branch: "factory/job-12345678-police-incident-records-request",
      baseSha: "a".repeat(40),
      commitSha: "b".repeat(40),
      specPath: "records-request/workflows/police-incident-records-request/workflow.spec.json",
      profileRegistryPath: "packages/workflows/src/domain-packs/records-request/generated-profile-specs.json",
      configPath: "records-request/workflows/police-incident-records-request/config.ts",
      changedFiles: [
        "records-request/workflows/police-incident-records-request/config.ts",
      ],
      checks: [],
      builtAt: "2026-09-30T20:05:00.000Z",
    },
    "2026-09-30T20:05:00.000Z",
  ).job;
  assert.equal(job.stage, "acceptance");

  job = recordFactoryJobAcceptance(job, {
    checks: [
      { id: "factory", command: "pnpm --filter @mailmypdf/workflows test", ok: true, summary: "passed" },
      { id: "acceptance", command: "pnpm --filter @mailmypdf/records-request test:acceptance", ok: true, summary: "passed" },
    ],
    now: "2026-09-30T20:06:00.000Z",
  }).job;

  assert.equal(job.status, "awaiting_review");
  assert.equal(job.stage, "publication_review");
  assert.equal(job.review.reason, "generated-workflow-publication");
  assert.equal(job.buildArtifact?.checks.length, 2);
  assert.throws(
    () => approveFactoryJobReview(job, "2026-09-30T20:07:00.000Z"),
    /publication executor/i,
  );
});

test("failed supervised acceptance is durable and blocks publication review", () => {
  let job = createFactoryJob({
    id: "job-build-fail",
    problem: "Create a new police incident records request workflow.",
    now: "2026-09-30T20:00:00.000Z",
  });
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:01:00.000Z").job;
  job = advanceFactoryJob(job, TOOLS, "2026-09-30T20:02:00.000Z").job;
  job = approveFactoryJobReview(job, "2026-09-30T20:03:00.000Z", {
    family: "records-request",
    sectionId: "records-request",
    workflowId: "police-incident-records-request",
    label: "Police Incident Records Request",
    startTemplate: "records-request",
  }).job;
  job = startFactoryJobBuild(job, "2026-09-30T20:04:00.000Z").job;
  job = recordFactoryJobBuildMaterialized(
    job,
    {
      branch: "factory/job-87654321-police-incident-records-request",
      baseSha: "a".repeat(40),
      commitSha: "b".repeat(40),
      specPath: "spec.json",
      profileRegistryPath: "profiles.json",
      configPath: "config.ts",
      changedFiles: ["config.ts"],
      checks: [],
      builtAt: "2026-09-30T20:05:00.000Z",
    },
    "2026-09-30T20:05:00.000Z",
  ).job;
  job = recordFactoryJobAcceptance(job, {
    checks: [
      { id: "acceptance", command: "test", ok: false, summary: "failed scenario" },
    ],
    now: "2026-09-30T20:06:00.000Z",
  }).job;

  assert.equal(job.status, "failed");
  assert.equal(job.stage, "acceptance");
  assert.ok(job.diagnostics.some((item) => item.code === "FACTORY_ACCEPTANCE_FAILED"));
});

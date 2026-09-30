import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceFactoryJob,
  approveFactoryJobReview,
  cancelFactoryJob,
  createFactoryJob,
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

  job = approveFactoryJobReview(job, "2026-09-30T20:03:00.000Z").job;
  assert.equal(job.status, "queued");
  assert.equal(job.stage, "build");
  assert.ok(job.diagnostics.some((item) => item.code === "BUILD_EXECUTOR_REQUIRED"));
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

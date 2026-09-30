import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkflowMaterializationPlan,
  canonicalSeedFromMaterializationSpec,
  isMaterializerOwnedFile,
  WORKFLOW_MATERIALIZATION_SPEC_VERSION,
  type WorkflowMaterializationSpec,
} from "../src/workflow-materialization.js";

const cp2000Spec = Object.freeze({
  schemaVersion: WORKFLOW_MATERIALIZATION_SPEC_VERSION,
  id: "notice-respond/cp2000-response",
  label: "CP2000 Response",
  execution: {
    kind: "platform",
    entry: "workspace-start",
    policyFamily: "notice-response",
  },
  authority: {
    module: "notice-cp2000-response",
    reviewedAt: "2026-09-15",
  },
  legacyGoldId: "notice/cp2000-response",
  startTemplate: "notice-response",
} as const satisfies WorkflowMaterializationSpec);

test("CP2000 materialization spec deterministically owns registry enrollment and static wrappers", () => {
  const plan = buildWorkflowMaterializationPlan(cp2000Spec);

  assert.deepEqual(plan.canonicalSeed, {
    id: "notice-respond/cp2000-response",
    label: "CP2000 Response",
    execution: {
      kind: "platform",
      entry: "workspace-start",
      policyFamily: "notice-response",
    },
    authority: {
      module: "notice-cp2000-response",
      reviewedAt: "2026-09-15",
    },
    legacyGoldId: "notice/cp2000-response",
  });

  assert.equal(plan.sectionId, "notice-respond");
  assert.equal(plan.slug, "cp2000-response");
  assert.deepEqual(
    plan.files.map((file) => file.path),
    [
      "notice-respond/workflows/cp2000-response/index.tsx",
      "notice-respond/workflows/cp2000-response/seo.ts",
      "notice-respond/workflows/cp2000-response/schema.ts",
      "mailmypdf/src/routes/notice-respond/workflows/cp2000-response/index.tsx",
      "notice-respond/workflows/cp2000-response/start/index.tsx",
      "mailmypdf/src/routes/notice-respond/workflows/cp2000-response/start/index.tsx",
    ],
  );
  assert.ok(plan.files.every((file) => isMaterializerOwnedFile(file.content)));
  assert.ok(
    plan.files
      .filter((file) => file.path.endsWith("/start/index.tsx"))
      .every((file) =>
        file.content.includes(
          'getNoticeResponseFactoryArtifact("cp2000-response")',
        ),
      ),
  );
  assert.equal(
    plan.files.some((file) => file.path.endsWith("/config.ts")),
    false,
    "substantive landing copy remains human-authored",
  );
});

test("canonical seed projection excludes route-generation metadata", () => {
  const seed = canonicalSeedFromMaterializationSpec(cp2000Spec) as Record<
    string,
    unknown
  >;
  assert.equal("schemaVersion" in seed, false);
  assert.equal("startTemplate" in seed, false);
});

test("materializer fails closed when executable workflow lacks a start template", () => {
  assert.throws(
    () =>
      buildWorkflowMaterializationPlan({
        schemaVersion: WORKFLOW_MATERIALIZATION_SPEC_VERSION,
        id: "notice-respond/test-notice",
        label: "Test Notice",
        execution: {
          kind: "platform",
          entry: "workspace-start",
          policyFamily: "notice-response",
        },
      }),
    /requires a startTemplate/,
  );
});

test("notice-response route materializer cannot be attached to another section or runtime family", () => {
  assert.throws(
    () =>
      buildWorkflowMaterializationPlan({
        schemaVersion: WORKFLOW_MATERIALIZATION_SPEC_VERSION,
        id: "records-request/test-request",
        label: "Test Request",
        execution: {
          kind: "platform",
          entry: "workspace-start",
          policyFamily: "records-request",
        },
        startTemplate: "notice-response",
      }),
    /requires notice-respond/,
  );
});

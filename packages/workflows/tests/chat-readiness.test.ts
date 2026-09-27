import assert from "node:assert/strict";
import test from "node:test";

import { certifyWorkflowChatReadiness } from "../src/chat-readiness.js";
import { createNoticeResponseManifest } from "../src/domain-packs/notice-response/manifest.js";
import {
  createNoticeResponseRuntimePolicy,
} from "../src/domain-packs/notice-response/runtime-policy.js";
import { cp14NoticeResponseProfile } from "../src/domain-packs/notice-response/profiles.js";
import { createRecordsRequestManifest } from "../src/domain-packs/records-request/manifest.js";
import {
  createRecordsRequestRuntimePolicy,
} from "../src/domain-packs/records-request/runtime-policy.js";
import type { WorkflowManifest } from "../src/workflow-manifest.js";

const AVAILABLE_TOOLS = new Set([
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
]);

test("CP14 passes chat readiness only when manifest, runtime, gates, and tools align", () => {
  const manifest = createNoticeResponseManifest({ profile: cp14NoticeResponseProfile });
  const policy = createNoticeResponseRuntimePolicy("cp14-response");
  const result = certifyWorkflowChatReadiness({
    manifest,
    runtimePolicy: policy,
    availableTools: AVAILABLE_TOOLS,
  });

  assert.equal(result.certified, true);
  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.requiredTools.includes("analyze_matter"));
  assert.ok(result.requiredTools.includes("preview_packet"));
});

test("records request passes request-first chat readiness after contract reconciliation", () => {
  const manifest = createRecordsRequestManifest({
    workflowId: "public-records-request",
    title: "Public Records Request",
  }).manifest;
  const policy = createRecordsRequestRuntimePolicy("public-records-request");
  const result = certifyWorkflowChatReadiness({
    manifest,
    runtimePolicy: policy,
    availableTools: AVAILABLE_TOOLS,
  });

  assert.equal(result.certified, true);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.requiredTools.includes("analyze_matter"), false);
  assert.ok(result.requiredTools.includes("save_matter_input"));
});

test("chat readiness fails closed when a manifest field has no runtime binding", () => {
  const manifest = createNoticeResponseManifest({ profile: cp14NoticeResponseProfile });
  const firstStep = manifest.steps?.[0];
  assert.ok(firstStep);

  const broken: WorkflowManifest = {
    ...manifest,
    steps: [
      {
        ...firstStep,
        fields: [
          ...(firstStep.fields ?? []),
          {
            id: "unboundRequiredFact",
            label: "Unbound required fact",
            type: "text",
            required: true,
            origin: "user",
          },
        ],
      },
      ...(manifest.steps ?? []).slice(1),
    ],
  };

  const result = certifyWorkflowChatReadiness({
    manifest: broken,
    runtimePolicy: createNoticeResponseRuntimePolicy("cp14-response"),
    availableTools: AVAILABLE_TOOLS,
  });

  assert.equal(result.certified, false);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "MANIFEST_FIELD_UNBOUND" &&
        diagnostic.fieldId === "unboundRequiredFact",
    ),
  );
});

test("chat readiness fails closed when a required connector operation is unavailable", () => {
  const manifest = createNoticeResponseManifest({ profile: cp14NoticeResponseProfile });
  const tools = new Set(AVAILABLE_TOOLS);
  tools.delete("approve_packet");

  const result = certifyWorkflowChatReadiness({
    manifest,
    runtimePolicy: createNoticeResponseRuntimePolicy("cp14-response"),
    availableTools: tools,
  });

  assert.equal(result.certified, false);
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "CONNECTOR_TOOL_MISSING" &&
        diagnostic.toolName === "approve_packet",
    ),
  );
});

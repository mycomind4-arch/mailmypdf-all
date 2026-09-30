import assert from "node:assert/strict";
import test from "node:test";

import { certifyWorkflowChatReadiness } from "../src/chat-readiness.js";
import { canonicalChatFactoryReport, canonicalWorkflowArtifactPlan, chatExecutionBindingFor } from "../src/chat-execution-registry.js";
import { WORKFLOW_REGISTRY } from "../src/canonical-workflow-registry.js";
import { composeWorkflowForChat } from "../src/workflow-factory.js";
import { createNoticeResponseManifest } from "../src/domain-packs/notice-response/manifest.js";
import { createInsuranceAppealManifestForWorkflow } from "../src/domain-packs/appeal/insurance-manifest.js";
import { createInsuranceAppealRuntimePolicy } from "../src/domain-packs/appeal/insurance-runtime-policy.js";
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

test("canonical chat registry certifies supported platform families and excludes all others", () => {
  for (const workflow of WORKFLOW_REGISTRY) {
    const binding = chatExecutionBindingFor(workflow.slug);
    const supported = workflow.execution?.kind === "platform" &&
      ["notice-response", "records-request", "insurance-appeal"].includes(workflow.execution.policyFamily);
    assert.equal(Boolean(binding), supported, workflow.id);
    if (binding) {
      assert.equal(binding.manifest.id, workflow.slug, workflow.id);
      assert.equal(certifyWorkflowChatReadiness({
        manifest: binding.manifest,
        runtimePolicy: binding.policy,
        availableTools: AVAILABLE_TOOLS,
      }).certified, true, workflow.id);
    }
  }
  assert.equal(chatExecutionBindingFor("unknown-workflow"), null);
});

test("factory report separates catalog identity, missing contracts, and failing certification", () => {
  const report = canonicalChatFactoryReport(AVAILABLE_TOOLS);
  assert.equal(report.length, WORKFLOW_REGISTRY.length);
  assert.equal(report.filter((item) => item.chatExecutable).length, 21);
  assert.equal(report.filter((item) => item.reason === "chat-contract-not-registered").length, 3);
  const cp14 = report.find((item) => item.id === "notice-respond/cp14-response");
  assert.equal(cp14?.reason, "certified");
  assert.equal(cp14?.artifactPlan?.startRegistryKey, "notice-respond:cp14-response");
  assert.equal(cp14?.artifactPlan?.public.startHref, "/notice-respond/workflows/cp14-response/start");
  assert.equal(report.find((item) => item.id === "appeal-mail/appeal-ssdi-denial")?.reason, "chat-contract-not-registered");
  assert.equal(report.find((item) => item.id === "secured-transactions/secured-transaction-eligibility")?.reason, "platform-runtime-not-registered");

  const reduced = new Set(AVAILABLE_TOOLS);
  reduced.delete("preview_packet");
  const blocked = canonicalChatFactoryReport(reduced).find((item) => item.id === "notice-respond/cp14-response");
  assert.equal(blocked?.reason, "certification-failed");
  assert.ok(blocked?.diagnostics.some((item) => item.code === "CONNECTOR_TOOL_MISSING"));
});

test("CP14 factory artifact plan matches the canonical public and authenticated topology", () => {
  const plan = canonicalWorkflowArtifactPlan("cp14-response", AVAILABLE_TOOLS);
  assert.ok(plan);
  assert.equal(plan.schemaVersion, "mailmypdf.workflow-artifacts/v1");
  assert.equal(plan.canonicalId, "notice-respond/cp14-response");
  assert.equal(plan.sectionId, "notice-respond");
  assert.equal(plan.workflowId, "cp14-response");
  assert.equal(plan.startRegistryKey, "notice-respond:cp14-response");
  assert.equal(plan.public.href, "/notice-respond/workflows/cp14-response");
  assert.equal(plan.public.startHref, "/notice-respond/workflows/cp14-response/start");
  assert.equal(plan.workspace.href, "/dashboard/workflows/notice-respond/cp14-response");
  assert.equal(plan.workspace.startHref, "/dashboard/workflows/notice-respond/cp14-response/start");
  assert.equal(plan.public.startFile, "notice-respond/workflows/cp14-response/start/index.tsx");
  assert.deepEqual(plan.public.landingFiles, [
    "notice-respond/workflows/cp14-response/index.tsx",
    "notice-respond/workflows/cp14-response/config.ts",
    "notice-respond/workflows/cp14-response/seo.ts",
    "notice-respond/workflows/cp14-response/schema.ts",
  ]);
  assert.equal(plan.execution.kind, "platform");
  assert.equal(plan.execution.entry, "public-start");
  assert.equal(plan.execution.policyFamily, "notice-response");
  assert.equal(plan.manifest.route, plan.public.startHref);
  assert.equal(plan.manifest.pipeline, "P02_OFFICIAL_RESPONSE");
  assert.deepEqual(plan.manifest.documentIds, ["cp14-notice", "supporting-records"]);
  assert.ok(plan.manifest.stepIds.includes("documents"));
  assert.ok(plan.manifest.stepIds.includes("review"));
  assert.deepEqual(plan.manifest.gateIds, [
    "review-approved",
    "payment-authorized",
    "mail-authorized",
  ]);
  for (const scenario of [
    "correct-notice-source",
    "quarantined-source-or-evidence",
    "stale-evidence-review",
    "exact-packet-tamper",
    "payment-mail-idempotency",
  ]) {
    assert.ok(plan.manifest.acceptanceScenarioIds.includes(scenario), scenario);
  }
  assert.equal(plan.chat.executable, true);
  assert.equal(plan.chat.certified, true);
  assert.deepEqual(plan.chat.diagnostics, []);
  assert.ok(plan.chat.requiredTools.includes("analyze_matter"));
  assert.ok(plan.chat.requiredTools.includes("prepare_checkout"));
});

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


test("workflow factory exposes chatExecutable only when chat certification passes", () => {
  const manifest = createNoticeResponseManifest({ profile: cp14NoticeResponseProfile });
  const policy = createNoticeResponseRuntimePolicy("cp14-response");

  const ready = composeWorkflowForChat({
    manifest,
    runtimePolicy: policy,
    availableTools: AVAILABLE_TOOLS,
  });
  assert.equal(ready.executable, true);
  assert.equal(ready.chatExecutable, true);
  assert.equal(ready.chatReadiness.certified, true);

  const missingTool = new Set(AVAILABLE_TOOLS);
  missingTool.delete("preview_packet");
  const blocked = composeWorkflowForChat({
    manifest,
    runtimePolicy: policy,
    availableTools: missingTool,
  });
  assert.equal(blocked.executable, true);
  assert.equal(blocked.chatExecutable, false);
  assert.equal(blocked.chatReadiness.certified, false);
});


test("insurance appeal passes evidence-heavy chat readiness", () => {
  const defined = createInsuranceAppealManifestForWorkflow(
    "appeal-insurance-claim-denial",
  );
  assert.ok(defined);

  const result = certifyWorkflowChatReadiness({
    manifest: defined.manifest,
    runtimePolicy: createInsuranceAppealRuntimePolicy(
      "appeal-insurance-claim-denial",
    ),
    availableTools: AVAILABLE_TOOLS,
  });

  assert.equal(result.certified, true);
  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.requiredTools.includes("ingest_document"));
  assert.ok(result.requiredTools.includes("analyze_matter"));
  assert.ok(result.requiredTools.includes("preview_packet"));
});

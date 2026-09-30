import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  NOTICE_WORKFLOW_CONFIGS,
  NOTICE_WORKFLOW_IDS,
  type NoticeWorkflowId,
} from "../src/lib/notice-workflow-registry";
import { validateCaseInput } from "../src/lib/secure-core/case-inputs.server";
import { resolveCaseWorkflow } from "../src/lib/secure-core/workflow-runtime";
import {
  getNoticeResponseFactoryArtifact,
  workflowById,
} from "@mailmypdf/workflows";
import cp14LandingConfig from "../../notice-respond/workflows/cp14-response/config";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

const baseInput = {
  taxpayerName: "Factory Test Taxpayer",
  ssnOrItin: "***-**-1234",
  taxpayerAddress: "1 Test Way\nSacramento, CA 95814",
  taxYear: "2025",
  userFacts: "Synthetic fixture used only to verify workflow registration.",
};

test("every registered IRS notice workflow is executable through one contract", () => {
  for (const id of NOTICE_WORKFLOW_IDS) {
    const config = NOTICE_WORKFLOW_CONFIGS[id];
    assert.ok(config.noticeLabel.trim(), `${id} needs a notice label`);
    assert.ok(config.title.trim(), `${id} needs a title`);
    assert.ok(config.subtitle.trim(), `${id} needs a subtitle`);
    assert.ok(config.modes.length > 0, `${id} needs at least one response mode`);

    const runtime = resolveCaseWorkflow(id, "notice-response");
    assert.equal(runtime.id, id);
    assert.equal(runtime.verticalId, "notice-response");
    assert.equal(runtime.noticeFamily, "irs");
    assert.deepEqual(
      [...runtime.responseModes],
      config.modes.map(([value]) => value),
      `${id} runtime modes must come from the registry`,
    );

    const firstMode = config.modes[0][0];
    const parsed = validateCaseInput(id, { ...baseInput, responseMode: firstMode });
    assert.equal(parsed.responseMode, firstMode, `${id} needs an input schema for its registered modes`);
  }
});

test("unknown notice workflows stay non-executable", () => {
  assert.throws(() => resolveCaseWorkflow("not-a-workflow", "notice-response"));
  assert.throws(() => validateCaseInput("not-a-workflow", { ...baseInput, responseMode: "anything" }));
});

test("the generic route and UI remain exhaustive over NoticeWorkflowId", async () => {
  const route = await read("src/routes/notice/$.tsx");
  const ui = await read("src/components/workflows/irs-notice-workflow.tsx");
  const runtime = await read("src/lib/secure-core/workflow-runtime.ts");
  const inputs = await read("src/lib/secure-core/case-inputs.server.ts");

  assert.match(route, /isNoticeWorkflowId\(slug\)/);
  assert.match(route, /<IrsNoticeWorkflow workflow=\{slug\}/);
  assert.match(ui, /Record<NoticeWorkflowId, Array<\[EvidenceKind, string\]>>/);
  assert.match(runtime, /satisfies Record<NoticeWorkflowId, CaseWorkflowDefinition>/);
  assert.match(inputs, /satisfies Record<NoticeWorkflowId, z\.ZodTypeAny>/);
});

test("new notice workflows must be added by registry ID, not route branching", async () => {
  const route = await read("src/routes/notice/$.tsx");
  for (const id of NOTICE_WORKFLOW_IDS as readonly NoticeWorkflowId[]) {
    assert.doesNotMatch(
      route,
      new RegExp(`slug\\s*===\\s*["']${id}["']`),
      `${id} should be routed by the executable registry, not an ad-hoc branch`,
    );
  }
});


test("canonical CP14 is one factory artifact across registry, landing, runtime, and start UI", () => {
  const artifact = getNoticeResponseFactoryArtifact("cp14-response");
  const canonical = workflowById("notice-respond/cp14-response");

  assert.ok(artifact);
  assert.ok(canonical);
  assert.equal(artifact.factoryReady, true);
  assert.deepEqual(artifact.diagnostics, []);
  assert.deepEqual(artifact.canonical, canonical);

  assert.equal(cp14LandingConfig.id, artifact.workflowId);
  assert.equal(cp14LandingConfig.sectionId, artifact.canonical.sectionId);
  assert.equal(cp14LandingConfig.path, artifact.canonical.publicHref);
  assert.equal(cp14LandingConfig.startPath, artifact.manifest.route);
  assert.equal(artifact.startConfig.workflowId, cp14LandingConfig.id);
  assert.equal(artifact.startConfig.backHref, cp14LandingConfig.path);

  assert.equal(artifact.manifest.id, "cp14-response");
  assert.equal(artifact.manifest.vertical, "notice-respond");
  assert.equal(artifact.profile.primaryDocumentId, "cp14-notice");
  assert.equal(artifact.profile.extractionSchema, "irs.cp14.v1");
  assert.ok(artifact.runtimePolicy.chatContract);
});

test("canonical CP14 factory path does not depend on the legacy /notice runtime", async () => {
  const start = await read("../../notice-respond/workflows/cp14-response/start/index.tsx");
  const chatRegistry = await read("../packages/workflows/src/chat-execution-registry.ts").catch(() => "");

  assert.match(start, /getNoticeResponseFactoryArtifact\("cp14-response"\)/);
  assert.doesNotMatch(start, /src\/routes\/notice/);
  assert.doesNotMatch(start, /IrsNoticeWorkflow/);
  // The shared chat registry must resolve Notice Respond through the same factory artifact.
  const registrySource = chatRegistry || await read("../packages/workflows/src/chat-execution-registry.ts");
  assert.match(registrySource, /getNoticeResponseFactoryArtifact/);
});

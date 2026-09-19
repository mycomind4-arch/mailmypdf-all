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

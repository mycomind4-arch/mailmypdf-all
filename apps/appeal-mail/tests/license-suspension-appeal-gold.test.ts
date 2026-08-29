import test from "node:test";
import assert from "node:assert/strict";
import { getWorkflow } from "../src/domain/workflows.ts";

test("license suspension appeal is Gold-standard configured", () => {
  const workflow = getWorkflow("license-suspension-appeal");
  assert.equal(workflow.id, "license-suspension-appeal");
  assert.equal(workflow.acceptsDocuments, true);
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.ok(workflow.focusAreas.includes("License status"));
  assert.match(workflow.workflowPrompt, /license suspension/i);
});

test("license suspension Gold endpoints are present and wired to Gemini/server gates", async () => {
  const fs = await import("node:fs/promises");
  const files = [
    "src/routes/api/workflows/license-suspension-appeal/analyze.ts",
    "src/routes/api/workflows/license-suspension-appeal/draft.ts",
    "src/routes/api/workflows/license-suspension-appeal/approve.ts",
    "src/routes/api/workflows/license-suspension-appeal/checkout.ts",
    "src/components/workflow/license-suspension-appeal-workspace.tsx",
    "src/routes/workflows/license-suspension-appeal.tsx",
  ];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    assert.ok(source.length > 200, `${file} should contain a real implementation`);
  }
  const analyze = await fs.readFile(files[0], "utf8");
  const draft = await fs.readFile(files[1], "utf8");
  const approve = await fs.readFile(files[2], "utf8");
  const checkout = await fs.readFile(files[3], "utf8");
  const workspace = await fs.readFile(files[4], "utf8");
  assert.match(analyze, /control-plane\/ai/);
  assert.match(analyze, /generateContent/);
  assert.match(analyze, /from\("appeals"\)\.insert/);
  assert.match(draft, /task\}\)/);
  assert.match(draft, /draft|validation/);
  assert.match(approve, /runReadinessReview/);
  assert.match(approve, /assemblePacket/);
  assert.match(approve, /status: ?\"ready\"/);
  assert.match(checkout, /checkout\.sessions\.create/);
  assert.match(checkout, /status!==\"ready\"/);
  assert.match(workspace, /Understand it\. Build it\. Send it\./);
  assert.match(workspace, /license-suspension-appeal\/(analyze|draft|approve|checkout)/);
});

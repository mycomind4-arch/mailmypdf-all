import test from "node:test";
import assert from "node:assert/strict";
import { getWorkflow } from "../src/domain/workflows.ts";

test("license-revocation-appeal is Gold-standard configured", async () => {
  const workflow = getWorkflow("license-revocation-appeal");
  assert.equal(workflow.primaryKeyword, "license revoked appeal");
  assert.deepEqual(workflow.experienceStages, ["understand", "build", "send"]);
  assert.equal(workflow.acceptsDocuments, true);
  assert.equal(workflow.keywordIntent, "transactional");
  assert.ok(workflow.workflowPrompt.length > 80);
  const fs = await import("node:fs/promises");
  const required = [
    "src/routes/api/workflows/license-revocation-appeal/analyze.ts",
    "src/routes/api/workflows/license-revocation-appeal/draft.ts",
    "src/routes/api/workflows/license-revocation-appeal/approve.ts",
    "src/routes/api/workflows/license-revocation-appeal/checkout.ts",
    "src/components/workflow/license-revocation-appeal-workspace.tsx",
    "src/routes/workflows/license-revocation-appeal.tsx",
  ];
  for (const path of required) assert.ok((await fs.readFile(path, "utf8")).length > 300, `${path} should contain a substantive implementation`);
  const analyze = await fs.readFile(required[0], "utf8");
  assert.match(analyze, /uploadDocument/); assert.match(analyze, /control-plane\/ai/); assert.match(analyze, /generateContent/); assert.match(analyze, /from\("appeals"\)/); assert.match(analyze, /user_id: user\.id/);
  const draft = await fs.readFile(required[1], "utf8");
  assert.match(draft, /draftModel/); assert.match(draft, /validationModel/); assert.match(draft, /eq\("user_id", user\.id\)/); assert.match(draft, /eq\("version", ver\)/);
  const approve = await fs.readFile(required[2], "utf8");
  assert.match(approve, /runReadinessReview/); assert.match(approve, /assemblePacket/); assert.match(approve, /status: "ready"/); assert.match(approve, /a\.user_id !== user\.id/);
  const checkout = await fs.readFile(required[3], "utf8");
  assert.match(checkout, /STRIPE_SECRET_KEY/); assert.match(checkout, /a\.status !== "ready"/); assert.match(checkout, /workflow_id: "license-revocation-appeal"/);
  const workspace = await fs.readFile(required[4], "utf8");
  assert.match(workspace, /Build and send your appeal/); assert.match(workspace, /\/api\/workflows\/license-revocation-appeal\/analyze/); assert.match(workspace, /\/api\/workflows\/license-revocation-appeal\/draft/); assert.match(workspace, /\/api\/workflows\/license-revocation-appeal\/approve/); assert.match(workspace, /\/api\/workflows\/license-revocation-appeal\/checkout/); assert.match(workspace, /Approve & prepare to send/);
});

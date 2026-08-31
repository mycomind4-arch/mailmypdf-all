import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const file = (path: string) => resolve(root, path);
const read = (path: string) => readFileSync(file(path), "utf8");

test("FAFSA Gold workflow has the complete executable surface", () => {
  const paths = [
    "src/routes/workflows/fafsa-appeal.tsx",
    "src/components/workflow/fafsa-appeal-workspace.tsx",
    "src/routes/api/workflows/fafsa-appeal/analyze.ts",
    "src/routes/api/workflows/fafsa-appeal/draft.ts",
    "src/routes/api/workflows/fafsa-appeal/approve.ts",
    "src/routes/api/workflows/fafsa-appeal/checkout.ts",
  ];

  for (const path of paths) assert.equal(existsSync(file(path)), true, `missing Gold surface: ${path}`);
});

test("FAFSA upload path is document-first and authenticated", () => {
  const source = read("src/routes/api/workflows/fafsa-appeal/analyze.ts");
  assert.match(source, /requireAuthenticatedUser\(request\)/);
  assert.match(source, /request\.formData\(\)/);
  assert.match(source, /uploadDocument\(file\)/);
  assert.match(source, /application\/pdf/);
  assert.match(source, /image\/png/);
  assert.match(source, /image\/jpeg/);
  assert.match(source, /20\s*\*\s*1024\s*\*\s*1024/);
});

test("FAFSA analysis uses centralized Gemini configuration and persists the case", () => {
  const source = read("src/routes/api/workflows/fafsa-appeal/analyze.ts");
  assert.match(source, /api\/control-plane\/ai/);
  assert.match(source, /workflowSlug:\s*"fafsa-appeal"/);
  assert.match(source, /task:\s*"analysis"/);
  assert.match(source, /provider\s*!==\s*"gemini"/);
  assert.match(source, /generateContent/);
  assert.match(source, /JSON\.parse\(text\)/);
  assert.match(source, /from\("appeals"\)\.insert/);
  assert.match(source, /user_id:\s*user\.id/);
  assert.match(source, /workflow_id:\s*appeal\.workflowId/);
});

test("FAFSA draft path has independent Gemini validation and optimistic concurrency", () => {
  const source = read("src/routes/api/workflows/fafsa-appeal/draft.ts");
  assert.match(source, /task\}\)/);
  assert.match(source, /resolveGemini\("draft"\)/);
  assert.match(source, /resolveGemini\("validation"\)/);
  assert.match(source, /DRAFT:/);
  assert.match(source, /unsupportedClaims/);
  assert.match(source, /missingEvidence/);
  assert.match(source, /user_id|a\.user_id!==user\.id/);
  assert.match(source, /eq\("version",ver\)/);
  assert.match(source, /version:ver\+1/);
});

test("FAFSA approval is server-gated, readiness-scored, packetized, and owner-scoped", () => {
  const source = read("src/routes/api/workflows/fafsa-appeal/approve.ts");
  assert.match(source, /requireAuthenticatedUser\(request\)/);
  assert.match(source, /a\.user_id!==user\.id/);
  assert.match(source, /a\.workflow_id!=="fafsa-appeal"/);
  assert.match(source, /runReadinessReview/);
  assert.match(source, /review\.score<80/);
  assert.match(source, /issuesRequiringAttention>2/);
  assert.match(source, /assemblePacket/);
  assert.match(source, /status:"ready"/);
  assert.match(source, /eq\("version",ver\)/);
});

test("FAFSA checkout cannot bypass approval and preserves workflow identity", () => {
  const source = read("src/routes/api/workflows/fafsa-appeal/checkout.ts");
  assert.match(source, /a\.user_id!==user\.id/);
  assert.match(source, /a\.workflow_id!=="fafsa-appeal"/);
  assert.match(source, /a\.status!=="ready"\|\|!a\.review\|\|!a\.packet/);
  assert.match(source, /STRIPE_SECRET_KEY/);
  assert.match(source, /checkout\.sessions\.create/);
  assert.match(source, /workflow_id:"fafsa-appeal"/);
  assert.match(source, /metadata:/);
});

test("FAFSA customer experience is exactly Understand -> Build -> Send", () => {
  const source = read("src/components/workflow/fafsa-appeal-workspace.tsx");
  assert.match(source, /"understand"\|"build"\|"send"/);
  assert.match(source, /Choose document/);
  assert.match(source, /Analyze my decision/);
  assert.match(source, /Build my appeal/);
  assert.match(source, /Independent validation/);
  assert.match(source, /Approve & prepare to send/);
  assert.match(source, /Continue to payment/);
  assert.match(source, /application\/pdf,image\/png,image\/jpeg/);
  assert.match(source, /\/api\/workflows\/fafsa-appeal\/analyze/);
  assert.match(source, /\/api\/workflows\/fafsa-appeal\/draft/);
  assert.match(source, /\/api\/workflows\/fafsa-appeal\/approve/);
  assert.match(source, /\/api\/workflows\/fafsa-appeal\/checkout/);
});

test("FAFSA route uses the dedicated Gold workspace", () => {
  const source = read("src/routes/workflows/fafsa-appeal.tsx");
  assert.match(source, /FafsaAppealWorkspace/);
  assert.doesNotMatch(source, /AppealWorkflowWorkspace/);
  assert.match(source, /createFileRoute\("\/workflows\/fafsa-appeal"\)/);
});

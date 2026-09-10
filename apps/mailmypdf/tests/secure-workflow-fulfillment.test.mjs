import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(root, "..", "..");

async function appSource(path) {
  return readFile(join(root, path), "utf8");
}

async function workspaceSource(path) {
  return readFile(join(workspaceRoot, path), "utf8");
}

test("unified IRS notice workflow continues an immutable approval into checkout", async () => {
  const ui = await appSource("src/components/workflows/irs-notice-workflow.tsx");
  const client = await appSource("src/lib/notice-response-workflow-client.ts");
  const checkout = await appSource("src/routes/api/v2/cases/$id/checkout.ts");

  assert.match(ui, /createNoticeCheckout/);
  assert.match(ui, /Pay & mail approved packet/);
  assert.match(client, /\/api\/v2\/cases\/\$\{caseId\}\/checkout/);

  assert.match(checkout, /materializeApprovedPacket/);
  assert.match(checkout, /case_approval_id:\s*input\.approvalId/);
  assert.match(checkout, /approved_packet_sha256:\s*input\.packet\.packetSha256/);
  assert.match(checkout, /approved_price_cents:\s*input\.packet\.quote\.totalCents/);
  assert.match(checkout, /workflow_checkout_\$\{input\.approvalId\}/);
  assert.match(checkout, /Checkout session could not be bound to the approved order/);
});

test("approved packet is rebuilt and compared before order creation", async () => {
  const approval = await appSource("src/lib/secure-core/case-approval.server.ts");

  assert.match(approval, /export async function materializeApprovedPacket/);
  assert.match(approval, /assemblePacket\(letter, documents\)/);
  assert.match(approval, /packet\.sha256 !== approval\.packet_sha256/);
  assert.match(approval, /JSON\.stringify\(storedManifest\) !== JSON\.stringify\(currentManifest\)/);
  assert.match(approval, /quote\.totalCents !== storedQuote\.totalCents/);
});

test("database allows at most one order per immutable case approval", async () => {
  const migration = await appSource("supabase/migrations/20260910210000_workflow_order_bridge.sql");

  assert.match(migration, /add column if not exists case_approval_id uuid references public\.case_approvals\(id\)/);
  assert.match(migration, /create unique index if not exists orders_case_approval_uidx/);
  assert.match(migration, /approved_packet_sha256/);
  assert.match(migration, /approved_price_cents/);
  assert.match(migration, /case approval linkage is immutable/);
});

test("Stripe webhook verifies the stored workflow session and exact approved amount", async () => {
  const webhook = await appSource("src/routes/api/public/payments/webhook.ts");

  assert.match(webhook, /!order\.stripe_session_id \|\| order\.stripe_session_id !== session\.id/);
  assert.match(webhook, /session\.amount_total !== expectedAmount/);
  assert.match(webhook, /if \(order\.case_approval_id\)/);
  assert.match(webhook, /const expectedAmount = order\.approved_price_cents/);
  assert.match(webhook, /payment\.session_mismatch/);
  assert.match(webhook, /payment\.amount_mismatch/);
});

test("successful Lob submission remains authoritative even if workflow projection fails", async () => {
  const lob = await appSource("src/lib/lob.server.ts");

  assert.match(lob, /workflow_case_id/);
  assert.match(lob, /\.update\(\{ status: "submitted" \}\)/);
  assert.match(lob, /workflow\.case_sync_failed/);
  assert.doesNotMatch(lob, /Order submitted but workflow case could not be synchronized/);
});

test("shared mailing client targets the deployed TanStack API namespace", async () => {
  const client = await workspaceSource("packages/mailing-client/src/index.ts");

  assert.match(client, /"\/api\/v1\/documents"/);
  assert.match(client, /"\/api\/v1\/communications"/);
  assert.doesNotMatch(client, /request<[^>]+>\("\/v1\/documents"/);
});

test("saved IRS workflows resume from the case URL after checkout cancellation", async () => {
  const ui = await appSource("src/components/workflows/irs-notice-workflow.tsx");
  const client = await appSource("src/lib/notice-response-workflow-client.ts");
  const draftRoute = await appSource("src/routes/api/v2/cases/$id/draft.ts");
  const approvalRoute = await appSource("src/routes/api/v2/cases/$id/approve.ts");

  assert.match(ui, /new URLSearchParams\(window\.location\.search\)\.get\("case"\)/);
  assert.match(ui, /loadNoticeApproval/);
  assert.match(ui, /loadNoticeDraft/);
  assert.match(ui, /setApproved\(true\)/);
  assert.match(client, /loadNoticeApproval/);
  assert.match(client, /loadNoticeDraft/);
  assert.match(draftRoute, /GET:\s*async/);
  assert.match(approvalRoute, /GET:\s*async/);
});

test("expired Stripe workflow sessions release their order claim before retry", async () => {
  const checkout = await appSource("src/routes/api/v2/cases/$id/checkout.ts");

  assert.match(checkout, /Expired\/cancelled sessions must release the order claim/);
  assert.match(checkout, /\.update\(\{ stripe_session_id: null \}\)/);
  assert.match(checkout, /\.eq\("stripe_session_id", priorSessionId\)/);
  assert.match(checkout, /workflow_checkout_\$\{input\.approvalId\}/);
});

test("IRS evidence is scan-gated and source notices are not automatic enclosures", async () => {
  const ui = await appSource("src/components/workflows/irs-notice-workflow.tsx");
  const cases = await appSource("src/lib/secure-core/case.server.ts");
  const runtime = await appSource("src/lib/secure-core/workflow-runtime.ts");
  const analysis = await appSource("src/lib/secure-core/case-analysis.server.ts");
  const migration = await appSource("supabase/migrations/20260910214000_source_notice_not_auto_enclosure.sql");

  assert.match(ui, /Supporting documents/);
  assert.match(ui, /evidenceOptions/);
  assert.match(ui, /Refresh scan status/);
  assert.match(cases, /included:\s*input\.role === "evidence"/);
  assert.match(runtime, /The source notice must pass security checks before drafting/);
  assert.match(analysis, /find\(\(d\) => d\.role === "subject_notice"\)/);
  assert.doesNotMatch(analysis, /role === "subject_notice" && d\.included/);
  assert.match(migration, /cd\.role = 'subject_notice'/);
  assert.match(migration, /set included = false/);
  assert.match(migration, /case has no clean source notice/);
});


test("Supabase admin accepts the current secret-key variable name", async () => {
  const serverClient = await appSource("src/integrations/supabase/client.server.ts");
  const admin = await appSource("src/lib/supabase-admin.server.ts");
  const example = await appSource(".env.example");

  assert.match(serverClient, /SUPABASE_SERVICE_ROLE_KEY \?\? process\.env\.SUPABASE_SECRET_KEY/);
  assert.match(admin, /SUPABASE_SERVICE_ROLE_KEY \?\? process\.env\.SUPABASE_SECRET_KEY/);
  assert.match(example, /SUPABASE_SECRET_KEY=""/);
});

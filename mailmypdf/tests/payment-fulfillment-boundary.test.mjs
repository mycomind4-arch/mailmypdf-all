import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("orders remain drafts until a verified payment webhook transitions them", async () => {
  // After Phase 1 refactoring, order creation lives in mail.service.ts.
  const mailService = await source("src/services/mail.service.ts");
  const payments = await source("src/routes/api/public/payments/webhook.ts");

  // Orders are created with draft status
  assert.match(mailService, /status:\s*"draft"/);
  // The service must not submit to Lob directly (that's the fulfillment layer's job)
  assert.doesNotMatch(mailService, /submitOrderToLob/);

  // Payment webhook transitions from draft → paid_pending_manual_fulfillment
  assert.match(payments, /\.eq\("status",\s*"draft"\)/);
  assert.match(payments, /status:\s*"paid_pending_manual_fulfillment"/);
});

test("automatic Lob submission happens only after the paid transition succeeds", async () => {
  const payments = await source("src/routes/api/public/payments/webhook.ts");

  // There are two code paths: single-order and bulk-order.
  // Both must follow the same pattern: transition → guard → auto-submit flag check → submit call.
  
  // Single-order path
  const singleTransition = payments.indexOf("const { data: updated");
  const singleAutoSubmit = payments.indexOf("flags.isAutoSubmitEnabled() && flags.isLobEnabled()");
  const singleSubmitCall = payments.indexOf("await submitOrderToLob(order.id)");

  assert.ok(singleTransition >= 0, "paid transition must exist");
  assert.ok(singleAutoSubmit > singleTransition, "auto-submit must follow the paid transition");
  assert.ok(singleSubmitCall > singleAutoSubmit, "Lob submission must remain inside the guarded post-payment block");

  // Bulk-order path (if present)
  const bulkGuard = payments.indexOf("if (!updated || updated.length === 0)");
  if (bulkGuard >= 0) {
    const bulkAutoSubmit = payments.indexOf("flags.isAutoSubmitEnabled() && flags.isLobEnabled()", bulkGuard);
    const bulkSubmitCall = payments.indexOf("await submitOrderToLob(orderId)", bulkGuard);
    assert.ok(bulkAutoSubmit > bulkGuard, "bulk auto-submit must follow the transition guard");
    assert.ok(bulkSubmitCall > bulkAutoSubmit, "bulk Lob submission must follow auto-submit check");
  }
});

test("Lob submission is idempotent and restricted to paid or retryable states", async () => {
  const lob = await source("src/lib/lob.server.ts");
  const stateMachine = await source("src/lib/order-state-machine.ts");

  // Idempotency: skip if lob_letter_id already set
  assert.match(lob, /if \(order\.lob_letter_id\) return \{ skipped: true \}/);
  assert.ok(lob.includes("idempotencyKey:"));
  assert.ok(lob.includes("order_\${orderId}"));
  assert.match(lob, /\.is\("lob_letter_id",\s*null\)/);

  // The state machine's isSubmittableStatus function must list all submittable states
  assert.match(stateMachine, /"paid_pending_manual_fulfillment"/);
  assert.match(stateMachine, /"failed_fulfillment"/);
  assert.match(stateMachine, /"failed_provider_submission"/);

  // lob.server.ts must use the state machine's isSubmittableStatus check
  assert.match(lob, /isSubmittableStatus\(currentStatus\)/);
});

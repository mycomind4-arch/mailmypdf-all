import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  classifyScheduledPaymentIntentStatus,
  scheduledAddressVerificationReady,
} from "../src/lib/scheduled-mail.server";

test("scheduled payment intent statuses fail closed around charge completion", () => {
  assert.equal(classifyScheduledPaymentIntentStatus("requires_confirmation"), "confirm");
  assert.equal(classifyScheduledPaymentIntentStatus("succeeded"), "paid");
  assert.equal(classifyScheduledPaymentIntentStatus("processing"), "wait");
  for (const status of ["requires_action", "requires_payment_method", "canceled", "requires_capture"]) {
    assert.equal(classifyScheduledPaymentIntentStatus(status), "blocked");
  }
});

test("scheduled execution requires real current provider address verification", () => {
  assert.equal(scheduledAddressVerificationReady({
    to: { isDeliverable: true, level: "deliverable" },
    from: { isDeliverable: true, level: "deliverable" },
    shouldBlock: false,
  }), true);

  assert.equal(scheduledAddressVerificationReady({
    to: { isDeliverable: true, level: "provider_unavailable" },
    from: { isDeliverable: true, level: "provider_unavailable" },
    shouldBlock: false,
  }), false);

  assert.equal(scheduledAddressVerificationReady({
    to: { isDeliverable: false, level: "undeliverable" },
    from: { isDeliverable: true, level: "deliverable" },
    shouldBlock: true,
  }), false);
});

test("scheduled executor keeps operational interlock before Stripe payment creation", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const source = fs.readFileSync(path.join(root, "src/lib/scheduled-mail.server.ts"), "utf8");
  const interlock = source.indexOf("!flags.isAutoSubmitEnabled() || !flags.isLobEnabled()");
  const stripeCall = source.indexOf("loadOrCreatePaymentIntent(schedule");
  assert.ok(interlock >= 0);
  assert.ok(stripeCall > interlock, "Stripe payment execution must occur after the auto-mail safety interlock");
  assert.match(source, /scheduled_pi_create_\$\{schedule\.id\}/);
  assert.match(source, /scheduled_pi_confirm_\$\{schedule\.id\}/);
  assert.match(source, /claim_scheduled_mailing_payment/);
  assert.match(source, /payment_execution_key: null/);
  assert.match(source, /submitOrderToLob\(schedule\.order_id\)/);
});

test("internal scheduled-mail endpoint requires the server cleanup secret", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const source = fs.readFileSync(path.join(root, "src/routes/api/internal/scheduled-mailings.ts"), "utf8");
  assert.match(source, /getConfig\(\)\.jobs\.cleanupSecret/);
  assert.match(source, /authHeader !== "Bearer " \+ secret/);
  assert.doesNotMatch(source, /SUPABASE_ANON_KEY|publishable/i);
});

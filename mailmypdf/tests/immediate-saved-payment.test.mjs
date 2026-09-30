import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("immediate saved-payment send requires separate explicit charge and send confirmation", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  assert.match(immediate, /authorizeSavedPayment !== true \|\| raw\.userConfirmedSend !== true/);
  assert.match(immediate, /EXPLICIT_SEND_AUTHORIZATION_REQUIRED/);
});

test("immediate send revalidates approval, price, payment revision, and postal addresses before Stripe", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const approval = immediate.indexOf("state.packetSha256 !== packetSha256");
  const revision = immediate.indexOf("profile.revision !== paymentRevision");
  const address = immediate.indexOf("validateOrderAddresses(state.recipient, state.sender)");
  const claim = immediate.indexOf("await claimPaymentPath(state, executionKey)");
  const stripe = immediate.indexOf("await stripe.paymentIntents.create");

  assert.ok(approval >= 0, "approved hash/price comparison must exist");
  assert.ok(revision > approval, "saved-payment revision must be checked after approval");
  assert.ok(address > revision, "postal re-verification must happen before claiming payment");
  assert.ok(claim > address, "exclusive payment path must be claimed after postal verification");
  assert.ok(stripe > claim, "Stripe PaymentIntent must be created only after the payment path is claimed");
});

test("immediate send fails closed unless automatic Lob fulfillment is enabled before charging", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const interlock = immediate.indexOf("!flags.isAutoSubmitEnabled() || !flags.isLobEnabled()");
  const stripe = immediate.indexOf("await stripe.paymentIntents.create");
  assert.ok(interlock >= 0);
  assert.ok(stripe > interlock);
});

test("immediate send uses deterministic Stripe idempotency and never accepts raw card data", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  assert.match(immediate, /idempotencyKey: `immediate_pi_create_\$\{args\.executionKey\}`/);
  assert.match(immediate, /idempotencyKey: `immediate_pi_confirm_\$\{args\.executionKey\}`/);
  assert.doesNotMatch(immediate, /card_number|\bpan\b|\bcvc\b|\bcvv\b/i);
});

test("Lob submission occurs only after a succeeded saved-payment transition", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const classify = immediate.indexOf("classifyScheduledPaymentIntentStatus(paymentIntent.status)");
  const paidTransition = immediate.indexOf('"paid_pending_manual_fulfillment"');
  const fulfillment = immediate.lastIndexOf("return resumeImmediateFulfillment(refreshed, paymentEvent)");

  assert.ok(classify >= 0);
  assert.ok(paidTransition > classify, "paid transition must follow provider payment classification");
  assert.ok(fulfillment > paidTransition, "fulfillment must follow the paid transition");
});

test("successful payment is resumable without a second charge", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const priorEvent = immediate.indexOf("const paidEvent = await immediatePaymentEvent");
  const nonDraft = immediate.indexOf('if (state.status !== "draft")');
  const resume = immediate.indexOf("return resumeImmediateFulfillment(state, paidEvent)");
  const createIntent = immediate.indexOf("createOrResumePaymentIntent");

  assert.ok(priorEvent >= 0);
  assert.ok(nonDraft > priorEvent);
  assert.ok(resume > nonDraft);
  assert.ok(createIntent > resume, "paid retries must resume fulfillment before any Stripe creation path");
});

test("blocked PaymentIntent is cancelled before its order payment claim can be released", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const fnStart = immediate.indexOf("async function releaseBlockedPayment");
  const fnEnd = immediate.indexOf("function alreadyBeyondProviderSubmission", fnStart);
  const block = immediate.slice(fnStart, fnEnd);
  const cancel = block.indexOf("paymentIntents.cancel");
  const release = block.indexOf("clearPaymentClaim");
  assert.ok(cancel >= 0);
  assert.ok(release > cancel);
});

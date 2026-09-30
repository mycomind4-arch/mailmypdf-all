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

test("immediate send revalidates approval, postal addresses, exclusive payment path, and payment revision before Stripe execution", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const main = immediate.slice(immediate.indexOf("export async function chargeAndSendDirectPdfMail"));
  const approval = main.indexOf("state.packetSha256 !== packetSha256");
  const address = main.indexOf("validateOrderAddresses(state.recipient, state.sender)");
  const claim = main.indexOf("await claimPaymentPath(state, executionKey)");
  const revision = main.indexOf("profile.revision !== paymentRevision");
  const execute = main.indexOf("await createOrResumePaymentIntent");

  assert.ok(approval >= 0, "approved hash/price comparison must exist");
  assert.ok(address > approval, "postal re-verification must follow approval validation");
  assert.ok(claim > address, "exclusive payment path must be claimed after postal verification");
  assert.ok(revision > claim, "newly claimed payment paths must recheck the displayed saved-payment revision");
  assert.ok(execute > revision, "Stripe execution must follow the payment revision interlock");
});

test("immediate send fails closed unless automatic Lob fulfillment is enabled before charging", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  const interlock = immediate.indexOf("!flags.isAutoSubmitEnabled() || !flags.isLobEnabled()");
  const stripe = immediate.indexOf("await stripe.paymentIntents.create");
  assert.ok(interlock >= 0);
  assert.ok(stripe > interlock);
});

test("immediate send uses card-independent creation idempotency and never accepts raw card data", async () => {
  const immediate = await source("src/lib/immediate-mail.server.ts");
  assert.match(immediate, /idempotencyKey: `immediate_pi_create_\$\{args\.executionKey\}`/);
  assert.match(immediate, /idempotencyKey: `immediate_pi_confirm_\$\{args\.executionKey\}`/);
  const createBlock = immediate.slice(
    immediate.indexOf("paymentIntents.create"),
    immediate.indexOf("const customerId"),
  );
  assert.equal(createBlock.includes("payment_method:"), false, "PaymentIntent creation must not bind a potentially changed saved card");
  assert.match(immediate, /args\.profile\.revision === args\.authorizedPaymentRevision/);
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

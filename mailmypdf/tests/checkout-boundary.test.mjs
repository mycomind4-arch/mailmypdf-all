import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("checkout environment and return URL are server controlled", async () => {
  const orders = await source("src/lib/orders.functions.ts");
  const stripe = await source("src/lib/stripe.server.ts");

  assert.doesNotMatch(orders, /createStripeClient\(data\.environment\)/);
  assert.doesNotMatch(orders, /return_url:\s*data\.returnUrl/);
  assert.match(orders, /createStripeClient\(\)/);
  assert.match(orders, /getMailMyPdfBaseUrl/);

  assert.match(stripe, /PAYMENTS_ENV/);
  assert.match(stripe, /MAILMYPDF_BASE_URL/);
});

test("webhook verification uses the deployment payment environment", async () => {
  const webhook = await source("src/routes/api/public/payments/webhook.ts");

  assert.doesNotMatch(webhook, /searchParams\.get\("env"\)/);
  assert.doesNotMatch(webhook, /handleWebhook\(request,\s*rawEnv\)/);
  // Now uses SDK constructEvent via verifyWebhookWithSdk
  assert.match(webhook, /constructEvent/);
});

test("Stripe metadata does not contain the order lookup bearer token", async () => {
  const orders = await source("src/lib/orders.functions.ts");

  assert.doesNotMatch(orders, /lookupToken:\s*order\.lookup_token/);
  assert.match(orders, /metadata:\s*\{\s*orderId:\s*order\.id\s*\}/);
});

test("checkout session creation is idempotent and reuses an existing session", async () => {
  const orders = await source("src/lib/orders.functions.ts");

  assert.match(orders, /stripe_session_id/);
  assert.match(orders, /checkout\.sessions\.retrieve/);
  assert.match(orders, /idempotencyKey:/);
  assert.match(orders, /checkout_\$\{order\.id\}/);
});

test("checkout does not silently enable automatic tax", async () => {
  const orders = await source("src/lib/orders.functions.ts");
  assert.doesNotMatch(orders, /automatic_tax/);
});

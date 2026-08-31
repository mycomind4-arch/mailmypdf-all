import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checkout = await readFile(new URL("../server/api/checkout.ts", import.meta.url), "utf8");
const mailing = await readFile(new URL("../server/api/mail/response.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const funnel = await readFile(new URL("../src/components/mailing-funnel.tsx", import.meta.url), "utf8");


test("checkout requires authenticated account and creates a durable mailing intent", () => {
  assert.match(checkout, /requireAuthenticatedUser/);
  assert.match(checkout, /mailing_intents/);
  assert.match(checkout, /stripe\.checkout\.sessions\.create/);
  assert.match(checkout, /mailing_intent_id/);
});

test("mailing endpoint requires a paid Stripe session and verifies ownership", () => {
  assert.match(mailing, /requireAuthenticatedUser/);
  assert.match(mailing, /payment_status !== \"paid\"/);
  assert.match(mailing, /owner_user_id/);
  assert.match(mailing, /mailing_intent_id/);
  assert.match(mailing, /stripe\.checkout\.sessions/);
});

test("mailing schema supports redirect-safe idempotent intents", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS mailing_intents/);
  assert.match(schema, /stripe_session_id TEXT UNIQUE/);
  assert.match(schema, /provider_order_id TEXT/);
  assert.match(schema, /ALTER TABLE mailing_intents ENABLE ROW LEVEL SECURITY/);
});

test("client funnel sends payment intent to checkout instead of directly mailing", () => {
  assert.match(funnel, /\/api\/checkout/);
  assert.match(funnel, /\/api\/mail\/response/);
  assert.match(funnel, /stripeSessionId/);
  assert.match(funnel, /window\.location\.assign\(payload\.checkoutUrl\)/);
  assert.doesNotMatch(funnel, /formData\.append\("recipientName"/);
});

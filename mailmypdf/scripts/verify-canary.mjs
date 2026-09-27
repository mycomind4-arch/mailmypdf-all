#!/usr/bin/env node

/**
 * Read-only post-transaction verifier for a controlled MailMyPDF canary.
 *
 * This script NEVER creates a Stripe charge or Lob mailpiece. It verifies that
 * one order already created through the real application is coherently linked
 * across Supabase, Stripe, and Lob.
 *
 * Usage:
 *   pnpm --filter ./mailmypdf verify:canary -- --order <uuid>
 *   pnpm --filter ./mailmypdf verify:canary -- --order <uuid> --expect mailed
 *   pnpm --filter ./mailmypdf verify:canary -- --order <uuid> --expect delivered
 */

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] ?? null : null;
};

const orderId = arg("--order");
const expectedStage = arg("--expect") || "submitted";
const allowedStages = new Set(["paid", "submitted", "mailed", "delivered"]);

if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
  console.error("FAIL  --order must be a valid order UUID");
  process.exit(2);
}
if (!allowedStages.has(expectedStage)) {
  console.error("FAIL  --expect must be one of: paid, submitted, mailed, delivered");
  process.exit(2);
}

const value = (name) => process.env[name]?.trim() || null;
const required = (name) => {
  const v = value(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
};

const supabaseUrl = required("SUPABASE_URL");
const supabaseKey = value("SUPABASE_SECRET_KEY") || value("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseKey) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

const paymentsEnv = value("PAYMENTS_ENV") || "sandbox";
const stripeKey =
  paymentsEnv === "live" ? required("STRIPE_LIVE_API_KEY") : required("STRIPE_SANDBOX_API_KEY");
const lobKey = expectedStage === "paid" ? value("LOB_API_KEY") : required("LOB_API_KEY");

const checks = [];
const pass = (name, detail = "") => checks.push({ status: "PASS", name, detail });
const warn = (name, detail = "") => checks.push({ status: "WARN", name, detail });
const fail = (name, detail = "") => checks.push({ status: "FAIL", name, detail });

async function jsonOrText(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function supabase(path) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: "application/json",
    },
  });
  const body = await jsonOrText(response);
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${typeof body === "string" ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
  return body;
}

const orderRows = await supabase(
  `/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,price_cents,mail_class,document_sha256,stripe_session_id,lob_letter_id,paid_at,mailed_at,delivered_at,tracking_number,expected_delivery_date,last_tracking_event`,
);
const order = Array.isArray(orderRows) ? orderRows[0] : null;
if (!order) {
  console.error("FAIL  Order not found in configured Supabase project");
  process.exit(1);
}

pass("Order record", order.id);
if (/^[a-f0-9]{64}$/i.test(order.document_sha256 || "")) pass("Document SHA-256", order.document_sha256);
else fail("Document SHA-256", "missing or invalid — canary cannot tie fulfillment to exact PDF bytes");

if (Number.isInteger(order.price_cents) && order.price_cents > 0) pass("Order price", `$${(order.price_cents / 100).toFixed(2)}`);
else fail("Order price", "missing or invalid");

if (order.paid_at) pass("Paid timestamp", order.paid_at);
else fail("Paid timestamp", "not recorded");

if (!order.stripe_session_id) {
  fail("Stripe session", "order has no stripe_session_id");
} else {
  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.stripe_session_id)}`,
    { headers: { Authorization: `Bearer ${stripeKey}` } },
  );
  const stripe = await jsonOrText(stripeResponse);
  if (!stripeResponse.ok) {
    fail("Stripe session", `HTTP ${stripeResponse.status}`);
  } else {
    if (stripe.id === order.stripe_session_id) pass("Stripe session", stripe.id);
    else fail("Stripe session", "provider ID mismatch");

    if (stripe.payment_status === "paid") pass("Stripe payment", "paid");
    else fail("Stripe payment", `payment_status=${stripe.payment_status ?? "unknown"}`);

    const metadataOrderId = stripe.metadata?.orderId ?? stripe.metadata?.order_id ?? null;
    if (metadataOrderId === order.id) pass("Stripe order linkage", order.id);
    else fail("Stripe order linkage", `metadata order ID was ${metadataOrderId ?? "missing"}`);

    if (stripe.amount_total === order.price_cents) pass("Stripe amount", `${stripe.amount_total} cents`);
    else fail("Stripe amount", `Stripe=${stripe.amount_total ?? "unknown"}; order=${order.price_cents}`);
  }
}

const eventRows = await supabase(
  `/rest/v1/order_events?order_id=eq.${encodeURIComponent(orderId)}&select=type,label,created_at,metadata&order=created_at.asc`,
);
const events = Array.isArray(eventRows) ? eventRows : [];
if (events.length) pass("Order event history", `${events.length} event(s)`);
else fail("Order event history", "empty");

const hasPaymentEvent = events.some((e) =>
  ["payment.received", "checkout.session.completed", "stripe.checkout.session.completed"].includes(e.type) ||
  String(e.type || "").includes("payment"),
);
if (hasPaymentEvent) pass("Payment audit event", "present");
else warn("Payment audit event", "no obvious payment event type found; inspect timeline manually");

if (expectedStage !== "paid") {
  if (!order.lob_letter_id) {
    fail("Lob submission", "order has no lob_letter_id");
  } else {
    const auth = Buffer.from(`${lobKey}:`).toString("base64");
    const lobResponse = await fetch(
      `https://api.lob.com/v1/letters/${encodeURIComponent(order.lob_letter_id)}`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const letter = await jsonOrText(lobResponse);
    if (!lobResponse.ok) {
      fail("Lob letter", `HTTP ${lobResponse.status}`);
    } else {
      if (letter.id === order.lob_letter_id) pass("Lob letter", letter.id);
      else fail("Lob letter", "provider ID mismatch");

      const providerOrderId =
        letter.metadata?.order_id ?? letter.metadata?.orderId ?? letter.metadata?.reference_id ?? null;
      if (providerOrderId === order.id) pass("Lob order linkage", order.id);
      else warn("Lob order linkage", `provider metadata did not expose order ID; got ${providerOrderId ?? "none"}`);

      pass("Lob provider status", String(letter.status ?? "unknown"));

      const providerTracking = letter.tracking_number ?? null;
      if (providerTracking && order.tracking_number && providerTracking !== order.tracking_number) {
        fail("Tracking number linkage", `Lob=${providerTracking}; order=${order.tracking_number}`);
      } else if (order.tracking_number || providerTracking) {
        pass("Tracking number linkage", order.tracking_number || providerTracking);
      } else if (["certified", "registered"].includes(order.mail_class) && ["mailed", "delivered"].includes(expectedStage)) {
        fail("Tracking number linkage", "tracked mail class reached expected stage without a stored/provider tracking number");
      } else {
        warn("Tracking number linkage", "not available yet");
      }
    }
  }
}

const status = String(order.status || "");
const fulfillmentProgress = [
  "draft",
  "checkout_created",
  "paid_pending_manual_fulfillment",
  "manual_fulfillment_in_progress",
  "submitted_to_provider",
  "provider_processing",
  "mailed",
  "in_transit",
  "delivered",
  "returned",
];
const progress = fulfillmentProgress.indexOf(status);

if (expectedStage === "submitted" && progress >= fulfillmentProgress.indexOf("submitted_to_provider")) {
  pass("Expected fulfillment stage", status);
} else if (expectedStage === "mailed" && progress >= fulfillmentProgress.indexOf("mailed")) {
  pass("Expected fulfillment stage", status);
  if (order.mailed_at) pass("Mailed timestamp", order.mailed_at);
  else fail("Mailed timestamp", "status is mailed-or-later but mailed_at is missing");
} else if (expectedStage === "delivered") {
  if (["delivered", "returned"].includes(status)) pass("Expected fulfillment stage", status);
  else fail("Expected fulfillment stage", `expected delivered-or-later; got ${status}`);
  if (order.delivered_at) pass("Delivered timestamp", order.delivered_at);
  else fail("Delivered timestamp", "delivery expected but delivered_at is missing");
} else if (expectedStage === "paid") {
  if (order.paid_at) pass("Expected fulfillment stage", status);
}

if (order.last_tracking_event) {
  pass("Latest carrier evidence", typeof order.last_tracking_event === "string"
    ? order.last_tracking_event.slice(0, 120)
    : JSON.stringify(order.last_tracking_event).slice(0, 120));
} else if (["mailed", "delivered"].includes(expectedStage)) {
  warn("Latest carrier evidence", "last_tracking_event is not populated");
}

const widths = {
  status: Math.max(6, ...checks.map((c) => c.status.length)),
  name: Math.max(4, ...checks.map((c) => c.name.length)),
};
for (const check of checks) {
  console.log(`${check.status.padEnd(widths.status)}  ${check.name.padEnd(widths.name)}  ${check.detail}`);
}

const failures = checks.filter((c) => c.status === "FAIL").length;
const warnings = checks.filter((c) => c.status === "WARN").length;
console.log(`\nCanary ${order.id}: ${failures} failure(s), ${warnings} warning(s).`);
console.log("Read-only verification complete. No charge or mailpiece was created.");
process.exitCode = failures ? 1 : 0;

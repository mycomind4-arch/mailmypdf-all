import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createHash } from "node:crypto";

const pdf = new TextEncoder().encode("%PDF-1.7 reviewed test document");
const sha = createHash("sha256").update(pdf).digest("hex");
const address = { name: "Customer", line1: "1 Main St", line2: null, city: "Austin", state: "TX", postal: "78701" };
const mailing = { sender: address, recipient: address, mailClass: "standard", color: false };
let order: any;
let approval: any;
let rpcCalls: any[];
let created = 0;
let expired = 0;
let race = false;
let rpcError = false;
let verificationEvent: any;
let providerLevel = "deliverable";
let verificationWriteError = false;
let owned = true;
let validationCalls = 0;

function reset() {
  order = { id: "order-1", lookup_token: "private", status: "draft", email: "test@example.com",
    page_count: 1, price_cents: 799, file_name: "test.pdf", pdf_storage_path: "owned.pdf",
    stripe_session_id: null, color: false, mail_class: "standard",
    approved_packet_sha256: null, approved_price_cents: null };
  for (const prefix of ["sender", "recipient"]) {
    for (const [key, value] of Object.entries(address)) order[`${prefix}_${key}`] = value;
  }
  approval = null; rpcCalls = []; created = 0; expired = 0; race = false; rpcError = false;
  verificationEvent = { verified: true, mailing_snapshot: mailing, expires_at: new Date(Date.now() + 60_000).toISOString(),
    verification: { sender: { ready: true, status: "verified" }, recipient: { ready: true, status: "verified" } } };
  providerLevel = "deliverable"; verificationWriteError = false; owned = true; validationCalls = 0;
}

const admin = {
  from(table: string) {
    const filters: any = {};
    let update: any;
    const chain: any = {
      select() { return chain; }, eq(k: string, v: unknown) { filters[k] = v; return chain; },
      contains(_key: string, value: any) { Object.assign(filters, value); return chain; }, limit() { return chain; }, is() { return chain; },
      order() { return chain; },
      update(value: any) { update = value; return chain; },
      insert(value: any) {
        if (value.type === "mcp.direct_mail.addresses_reviewed") {
          if (verificationWriteError) return Promise.resolve({ error: { message: "offline" } });
          verificationEvent = value.metadata;
        }
        return Promise.resolve({ error: null });
      },
      async maybeSingle() {
        if (table === "orders") return { data: { ...order }, error: null };
        if (filters.type === "mcp.direct_mail.addresses_reviewed") return { data: verificationEvent ? { metadata: verificationEvent } : null, error: null };
        if (filters.type === "mcp.direct_mail.approved") return { data: approval ? { metadata: approval } : null, error: null };
        assert.equal(filters.owner_id, "owner-1");
        return { data: owned ? { id: "owner-event", order_id: order.id, metadata: { secure_document_id: "doc-1" } } : null, error: null };
      },
      then(resolve: any, reject: any) {
        if (table === "order_events" && filters.type === "mcp.direct_mail.prepared") {
          assert.equal(filters.owner_id, "owner-1");
          return Promise.resolve({ data: [{ order_id: order.id }], error: null }).then(resolve, reject);
        }
        if (update) Object.assign(order, update);
        return Promise.resolve({ data: race ? [] : [{ id: order.id }], error: null }).then(resolve, reject);
      },
    };
    return chain;
  },
  storage: { from() { return { download: async () => ({ data: new Blob([pdf]), error: null }) }; } },
  async rpc(name: string, args: any) {
    rpcCalls.push({ name, args });
    if (rpcError) return { data: null, error: { message: "concurrent change" } };
    const reused = Boolean(approval);
    order.approved_packet_sha256 = args.p_packet_sha256;
    order.approved_price_cents = args.p_total_cents;
    approval = { owner_id: "owner-1", packet_sha256: sha, total_cents: 799, mailing_snapshot: args.p_mailing_snapshot };
    return { data: reused, error: null };
  },
};
mock.module("../src/lib/secure-core/auth.server.ts", { namedExports: {
  requireAuthenticatedUser: async () => ({ user: { id: "owner-1", email: "test@example.com" }, supabase: admin }),
} });
mock.module("../src/integrations/supabase/client.server.ts", { namedExports: { supabaseAdmin: admin } });
mock.module("../src/lib/mail-checkout-quote.server.ts", { namedExports: { mailCheckoutQuote: async () => ({ totalCents: 799 }) } });
mock.module("../src/lib/distributed-rate-limit.ts", { namedExports: { distributedRateLimit: async () => ({ allowed: true }) } });
mock.module("../src/lib/address-validation.ts", { namedExports: { validateOrderAddresses: async () => {
  validationCalls++;
  const result = { level: providerLevel, providerSucceeded: providerLevel !== "provider_unavailable", isDeliverable: providerLevel === "deliverable", warnings: [] };
  return { to: result, from: result };
} } });
mock.module("../src/lib/stripe.server.ts", { namedExports: {
  getMailMyPdfBaseUrl: () => "https://mailmypdf.example",
  createStripeClient: () => ({ checkout: { sessions: {
    create: async () => { created++; return { id: "cs_same", url: "https://checkout.stripe.com/test" }; },
    retrieve: async () => ({ id: "cs_same", status: "open", url: "https://checkout.stripe.com/test" }),
    expire: async () => { expired++; },
  } } }),
} });

const { approveDirectPdfMail, prepareDirectPdfCheckout, prepareDirectPdfMail, reviewDirectPdfMail, readDirectPdfPreview, getMailingContext } = await import("../src/lib/mcp/direct-mail.server");
const request = new Request("https://mailmypdf.example/api/mcp");
const review = { orderId: "order-1", expectedPacketSha256: sha, expectedTotalCents: 799,
  expectedSender: address, expectedRecipient: address, expectedMailClass: "standard", expectedColor: false };

test("first approval succeeds without a previous approval and records the exact snapshot atomically", async () => {
  reset();
  const result = await approveDirectPdfMail(request, review);
  assert.equal(result.approval.approved, true);
  assert.equal(result.reused, false);
  assert.equal(rpcCalls[0].name, "approve_mcp_direct_mail");
  assert.deepEqual(rpcCalls[0].args.p_mailing_snapshot, mailing);
  assert.equal(created, 0);
});

test("approval rejects changed recipient and concurrent database changes", async () => {
  reset();
  await assert.rejects(approveDirectPdfMail(request, { ...review, expectedRecipient: { ...address, postal: "78702" } }), /changed after review/);
  assert.equal(rpcCalls.length, 0);
  rpcError = true;
  await assert.rejects(approveDirectPdfMail(request, review), /approval could not be recorded/);
});

test("checkout requires an immutable snapshot and compares JSONB without relying on key order", async () => {
  reset();
  order.approved_packet_sha256 = sha; order.approved_price_cents = 799;
  await assert.rejects(prepareDirectPdfCheckout(request, order.id), /immutable approval/);
  assert.equal(created, 0);
  approval = { owner_id: "owner-1", packet_sha256: sha, total_cents: 799,
    mailing_snapshot: { color: false, mailClass: "standard", recipient: { postal: "78701", state: "TX", city: "Austin", line2: null, line1: "1 Main St", name: "Customer" }, sender: address } };
  const checkout = await prepareDirectPdfCheckout(request, order.id);
  assert.equal(checkout.checkoutUrl, "https://checkout.stripe.com/test");
  assert.equal(created, 1);
  order.recipient_postal = "78702";
  await assert.rejects(prepareDirectPdfCheckout(request, order.id), /immutable approval/);
  assert.equal(created, 1);
});

test("a racing checkout never expires the identical session saved by its winner", async () => {
  reset();
  await approveDirectPdfMail(request, review);
  race = true;
  const result = await prepareDirectPdfCheckout(request, order.id);
  assert.equal(result.reused, true);
  assert.equal(expired, 0);
});

test("reusing a direct-mail retry key with another document is rejected before creating an order", async () => {
  reset();
  await assert.rejects(prepareDirectPdfMail(request, { documentId: "doc-2", ...mailing, idempotencyKey: "retry-key-1" }), /different mailing details/);
  assert.equal(rpcCalls.length, 0);
});

test("review produces a verified structured draft and private exact PDF without paying", async () => {
  reset(); verificationEvent = null;
  const result = await reviewDirectPdfMail(request, order.id);
  assert.equal(result.draft.readyForApproval, true);
  assert.equal(result.draft.document.sha256, sha);
  assert.deepEqual(result.draft.cost, { currency: "USD", totalCents: 799 });
  assert.equal(result.draft.envelopePreview.illustrative, true);
  const resource = await readDirectPdfPreview(request, result.review.previewResourceUri);
  assert.equal(Buffer.from(resource.blob, "base64").toString(), new TextDecoder().decode(pdf));
  assert.equal(created, 0); assert.equal(rpcCalls.length, 0);
  await reviewDirectPdfMail(request, order.id);
  assert.equal(validationCalls, 1, "fresh exact-address verification should be reused");
  await assert.rejects(prepareDirectPdfCheckout(request, order.id), /Approve the exact/);
  await approveDirectPdfMail(request, review);
  const checkout = await prepareDirectPdfCheckout(request, order.id);
  assert.equal(checkout.checkoutUrl, "https://checkout.stripe.com/test");
  assert.equal(created, 1);
  assert.equal(order.status, "draft", "creating checkout is neither payment nor mailing");
});

test("unavailable or incomplete postal verification cannot authorize approval", async () => {
  for (const level of ["provider_unavailable", "deliverable_missing_unit", "undeliverable"]) {
    reset(); verificationEvent = null; providerLevel = level;
    const result = await reviewDirectPdfMail(request, order.id);
    assert.equal(result.draft.readyForApproval, false);
    await assert.rejects(approveDirectPdfMail(request, review), /Verify both/);
    assert.equal(rpcCalls.length, 0); assert.equal(created, 0);
  }
});

test("approval rejects expired or address-mismatched verification", async () => {
  reset(); verificationEvent.expires_at = "2000-01-01T00:00:00Z";
  await assert.rejects(approveDirectPdfMail(request, review), /Verify both/);
  reset(); verificationEvent.mailing_snapshot = { ...mailing, sender: { ...address, postal: "78702" } };
  await assert.rejects(approveDirectPdfMail(request, review), /Verify both/);
  assert.equal(rpcCalls.length, 0);
});

test("review fails closed when evidence cannot be saved", async () => {
  reset(); verificationEvent = null; verificationWriteError = true;
  await assert.rejects(reviewDirectPdfMail(request, order.id), /could not be saved/);
  await assert.rejects(approveDirectPdfMail(request, review), /Verify both/);
});

test("direct PDF resources enforce ownership and exact document hash", async () => {
  reset();
  const uri = `mailmypdf://direct-pdf/order-1?sha256=${sha}`;
  owned = false;
  await assert.rejects(readDirectPdfPreview(request, uri), /Order not found/);
  await assert.rejects(reviewDirectPdfMail(request, order.id), /Order not found/);
  owned = true;
  await assert.rejects(readDirectPdfPreview(request, uri.replace(sha, "a".repeat(64))), /PDF changed/);
});

test("recent mailing context is owner-scoped and excludes private storage and checkout tokens", async () => {
  reset();
  const result = await getMailingContext(request);
  assert.deepEqual(result.recentMailings[0].sender, address);
  assert.deepEqual(result.recentMailings[0].recipient, address);
  assert.doesNotMatch(JSON.stringify(result), /lookup_token|pdf_storage_path|stripe_session_id|test@example/);
  owned = false;
  await assert.rejects(getMailingContext(request), /Order not found/);
});

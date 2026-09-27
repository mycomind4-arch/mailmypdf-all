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

function reset() {
  order = { id: "order-1", lookup_token: "private", status: "draft", email: "test@example.com",
    page_count: 1, price_cents: 799, file_name: "test.pdf", pdf_storage_path: "owned.pdf",
    stripe_session_id: null, color: false, mail_class: "standard",
    approved_packet_sha256: null, approved_price_cents: null };
  for (const prefix of ["sender", "recipient"]) {
    for (const [key, value] of Object.entries(address)) order[`${prefix}_${key}`] = value;
  }
  approval = null; rpcCalls = []; created = 0; expired = 0; race = false; rpcError = false;
}

const admin = {
  from(table: string) {
    const filters: any = {};
    let update: any;
    const chain: any = {
      select() { return chain; }, eq(k: string, v: unknown) { filters[k] = v; return chain; },
      contains() { return chain; }, limit() { return chain; }, is() { return chain; },
      order() { return chain; },
      update(value: any) { update = value; return chain; },
      insert() { return Promise.resolve({ error: null }); },
      async maybeSingle() {
        if (table === "orders") return { data: { ...order }, error: null };
        if (filters.type === "mcp.direct_mail.approved") return { data: approval ? { metadata: approval } : null, error: null };
        return { data: { id: "owner-event", order_id: order.id, metadata: { secure_document_id: "doc-1" } }, error: null };
      },
      then(resolve: any, reject: any) {
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
mock.module("../src/lib/stripe.server.ts", { namedExports: {
  getMailMyPdfBaseUrl: () => "https://mailmypdf.example",
  createStripeClient: () => ({ checkout: { sessions: {
    create: async () => { created++; return { id: "cs_same", url: "https://checkout.stripe.com/test" }; },
    retrieve: async () => ({ id: "cs_same", status: "open", url: "https://checkout.stripe.com/test" }),
    expire: async () => { expired++; },
  } } }),
} });

const { approveDirectPdfMail, prepareDirectPdfCheckout, prepareDirectPdfMail } = await import("../src/lib/mcp/direct-mail.server");
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

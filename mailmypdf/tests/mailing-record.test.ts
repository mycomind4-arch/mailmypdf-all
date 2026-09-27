import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMailingRecord, serveMailingRecord } from "../src/lib/mailing-record";

const id = "12345678-1234-4234-8234-123456789012";
const fixture = {
  order: {
    id,
    status: "draft",
    lookup_token: "never-export-me",
    admin_notes: "private",
    stripe_session_id: "private-session",
    pdf_storage_path: `${id}/file.pdf`,
    price_cents: 499,
    file_name: "file.pdf",
    paid_at: null,
    lob_letter_id: "ltr_test",
    document_sha256: "a".repeat(64),
    tracking_number: "9400111899223856928499",
    expected_delivery_date: "2026-09-29",
    delivered_at: "2026-09-29T17:00:00Z",
    mail_class: "certified",
    created_at: "2026-09-20T12:00:00Z",
    page_count: 1,
    color: false,
    sender_name: "Sender",
    sender_line1: "1 Main St",
    sender_line2: null,
    sender_city: "Town",
    sender_state: "CA",
    sender_postal: "90001",
    recipient_name: "Recipient",
    recipient_line1: "2 Main St",
    recipient_line2: null,
    recipient_city: "City",
    recipient_state: "CA",
    recipient_postal: "90002",
  },
  events: [{
    type: "lob.letter.certified.delivered",
    label: "Delivered",
    created_at: "2026-09-29T17:00:00Z",
    metadata: {
      secret: "private",
      external_id: "evt_test",
      lifecycle_status: "delivered",
      tracking_number: "9400111899223856928499",
    },
  }],
};
test("mailing record allowlist excludes access tokens, storage paths and private metadata", () => {
  const record = buildMailingRecord(fixture as never);
  const json = JSON.stringify(record);
  for (const secret of [
    "never-export-me",
    "private",
    "pdf_storage_path",
    "stripe_session_id",
    "metadata",
  ])
    assert.equal(json.includes(secret), false, secret);
  assert.equal(record.payment.receipt, "Not included in this record");
  assert.equal(record.document.sha256, "a".repeat(64));
  assert.equal(record.provider.reference, "ltr_test");
  assert.equal(record.provider.trackingNumber, "9400111899223856928499");
  assert.equal(record.delivery.deliveredAt, "2026-09-29T17:00:00Z");
  assert.equal(record.history[0].providerEventId, "evt_test");
  assert.equal(record.payment.paidAt, null);
});
function request(artifact = "summary") {
  return new Request("http://localhost/api/orders/record", {
    method: "POST",
    body: new URLSearchParams({ token: "test-only-token", artifact }),
  });
}
test("authorization failure never accesses storage and does not leak errors", async () => {
  let storageCalled = false;
  const response = await serveMailingRecord(request("document"), id, {
    loadOrder: async () => {
      throw new Error("secret backend info");
    },
    download: async () => {
      storageCalled = true;
      return new Blob();
    },
  });
  assert.equal(response.status, 404);
  assert.equal(storageCalled, false);
  assert.doesNotMatch(await response.text(), /secret/);
});
test("summary is a private attachment, not a payment receipt", async () => {
  const response = await serveMailingRecord(request(), id, {
    loadOrder: async () => fixture as never,
    download: async () => null,
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition")!, /attachment/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).kind, "MailMyPDF mailing evidence record — not a payment receipt");
});
test("evidence artifact is a private PDF with order and tracking facts", async () => {
  const response = await serveMailingRecord(request("evidence"), id, {
    loadOrder: async () => fixture as never,
    download: async () => null,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition")!, /mailing-evidence-/);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
});

test("download returns stored PDF unchanged and missing PDF is explicit", async () => {
  const original = new Blob(["%PDF-test-original"], { type: "application/pdf" });
  const deps = { loadOrder: async () => fixture as never, download: async () => original };
  assert.equal(
    await (await serveMailingRecord(request("document"), id, deps)).text(),
    await original.text(),
  );
  assert.equal(
    (await serveMailingRecord(request("document"), id, { ...deps, download: async () => null }))
      .status,
    404,
  );
});
test("a record cannot download another order's storage path", async () => {
  let downloaded = false;
  const response = await serveMailingRecord(request("document"), id, {
    loadOrder: async () =>
      ({
        ...fixture,
        order: { ...fixture.order, pdf_storage_path: "other-order/file.pdf" },
      }) as never,
    download: async () => {
      downloaded = true;
      return new Blob();
    },
  });
  assert.equal(response.status, 404);
  assert.equal(downloaded, false);
});

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
    lob_letter_id: null,
  },
  events: [{ type: "order.created", created_at: "2026-09-20", metadata: { secret: "private" } }],
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
  assert.equal(record.payment.receipt, "Not available in this record");
  assert.equal(record.delivery.proof, "Not available in this record");
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
  assert.equal((await response.json()).kind, "MailMyPDF mailing record — not a payment receipt");
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

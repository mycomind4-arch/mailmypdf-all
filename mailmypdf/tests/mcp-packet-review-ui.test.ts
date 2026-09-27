import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { PACKET_REVIEW_RESOURCE } from "../src/lib/mcp/packet-review-resource";

async function approve(result: unknown, direct = false, ready = true, action = "approve") {
  const elements = new Map<string, any>();
  const handlers = new Map<string, Function>();
  const calls: any[] = [];
  const document = { getElementById(id: string) {
    if (!elements.has(id)) elements.set(id, { textContent: "", hidden: id === "pdfShell", disabled: false, removeAttribute(name: string) { delete this[name]; }, addEventListener(name: string, callback: Function) { handlers.set(`${id}:${name}`, callback); } });
    return elements.get(id);
  } };
  let receive: Function;
  const window = {
    parent: { postMessage(message: any) {
      if (message.method === "tools/call") calls.push(message.params);
      if (message.id) queueMicrotask(() => receive({ source: window.parent, data: { jsonrpc: "2.0", id: message.id, result: message.method === "ui/initialize" ? {} : result } }));
    } },
    addEventListener(name: string, callback: Function) { if (name === "message") receive = callback; },
    openai: {
      toolInput: { matter_id: "matter-1", recipient: { name: "Customer", line1: "1 Main St", city: "Austin", state: "TX", postal: "78701" }, mail_class: "standard" },
      toolOutput: { packet: { packetSha256: "a".repeat(64), quote: { totalCents: 799 } }, review: { matterId: "matter-1", recipientSha256: "b".repeat(64), mailClass: "standard" } },
    },
  };
  if (direct) {
    (window.openai as any).toolOutput = {
      draft: { id: "order-1", readyForApproval: ready, document: { sha256: "a".repeat(64) },
        cost: { totalCents: 799 }, sender: window.openai.toolInput.recipient,
        recipient: window.openai.toolInput.recipient, mailingMethod: "certified", color: false },
      packet: { packetSha256: "a".repeat(64), quote: { totalCents: 799 } }, review: { kind: "direct", mailClass: "certified", previewResourceUri: "mailmypdf://direct-pdf/order-1?sha256=" + "a".repeat(64) },
    };
  }
  const script = PACKET_REVIEW_RESOURCE.text.match(/<script>([\s\S]*?)<\/script>/)![1];
  vm.runInNewContext(script, { document, window, Intl, console, Blob, Uint8Array, atob,
    navigator: { pdfViewerEnabled: false }, URL: { createObjectURL: () => "blob:test-pdf", revokeObjectURL() {} } });
  await handlers.get(`${action}:click`)!();
  elements.set("calls", calls);
  return elements;
}
test("review UI never reports failed or unconfirmed approval as success", async () => {
  for (const result of [{ isError: true, structuredContent: { error: "Review changed" } }, { isError: false, structuredContent: {} }]) {
    const elements = await approve(result);
    assert.equal(elements.get("approvalStatus").textContent, "Approval was not recorded.");
    assert.equal(elements.get("approve").disabled, false);
    assert.equal(elements.get("error").hidden, false);
  }
});
test("review UI reports approval only after a confirmed approval id", async () => {
  const elements = await approve({ isError: false, structuredContent: { approvalId: "approval-1" } });
  assert.equal(elements.get("approve").textContent, "Approved");
  assert.equal(elements.get("approve").disabled, true);
});

test("direct mailing card binds approval to the displayed draft and never calls checkout", async () => {
  const result = { isError: false, structuredContent: { approval: {
    approved: true, orderId: "order-1", packetSha256: "a".repeat(64), totalCents: 799,
  } } };
  const elements = await approve(result, true);
  assert.equal(elements.get("approve").textContent, "Approved");
  const calls = elements.get("calls");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "approve_direct_pdf_mail");
  assert.equal(calls[0].arguments.expected_mail_class, "certified");
  assert.equal(calls[0].arguments.expected_total_cents, 799);
  assert.equal(calls[0].arguments.expected_color, false);
  const blocked = await approve(result, true, false);
  assert.equal(blocked.get("calls").length, 0);
});

test("direct mailing card rejects missing or mismatched approval receipts", async () => {
  for (const approval of [{ approved: true }, { approved: true, orderId: "other", packetSha256: "a".repeat(64), totalCents: 799 }]) {
    const elements = await approve({ isError: false, structuredContent: { approval } }, true);
    assert.equal(elements.get("approvalStatus").textContent, "Approval was not recorded.");
  }
});

test("chat browsers without a PDF renderer get an exact-file download instead of a blank frame", async () => {
  const elements = await approve({ contents: [{
    uri: "mailmypdf://direct-pdf/order-1?sha256=" + "a".repeat(64),
    mimeType: "application/pdf", blob: Buffer.from("%PDF-fixture").toString("base64"),
  }] }, true, true, "viewPdf");
  assert.equal(elements.get("downloadPdf").href, "blob:test-pdf");
  assert.equal(elements.get("pdfFrame").hidden, true);
  assert.equal(elements.get("pdfFrame").src, undefined);
  assert.match(elements.get("pdfHelp").textContent, /cannot display PDF files inline/);
  assert.equal(elements.get("calls").length, 0);
});

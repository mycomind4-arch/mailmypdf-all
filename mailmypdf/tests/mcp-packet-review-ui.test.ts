import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { PACKET_REVIEW_RESOURCE } from "../src/lib/mcp/packet-review-resource";

async function approve(result: unknown) {
  const elements = new Map<string, any>();
  const handlers = new Map<string, Function>();
  const document = { getElementById(id: string) {
    if (!elements.has(id)) elements.set(id, { textContent: "", hidden: false, disabled: false, addEventListener(name: string, callback: Function) { handlers.set(`${id}:${name}`, callback); } });
    return elements.get(id);
  } };
  let receive: Function;
  const window = {
    parent: { postMessage(message: any) {
      if (message.id) queueMicrotask(() => receive({ source: window.parent, data: { jsonrpc: "2.0", id: message.id, result: message.method === "tools/call" ? result : {} } }));
    } },
    addEventListener(name: string, callback: Function) { if (name === "message") receive = callback; },
    openai: {
      toolInput: { matter_id: "matter-1", recipient: { name: "Customer", line1: "1 Main St", city: "Austin", state: "TX", postal: "78701" }, mail_class: "standard" },
      toolOutput: { packet: { packetSha256: "a".repeat(64), quote: { totalCents: 799 } }, review: { matterId: "matter-1", recipientSha256: "b".repeat(64), mailClass: "standard" } },
    },
  };
  const script = PACKET_REVIEW_RESOURCE.text.match(/<script>([\s\S]*?)<\/script>/)![1];
  vm.runInNewContext(script, { document, window, Intl, console });
  await handlers.get("approve:click")!();
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

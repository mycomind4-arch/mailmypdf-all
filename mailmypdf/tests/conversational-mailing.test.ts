import assert from "node:assert/strict";
import test from "node:test";
import { directPdfPreviewUri, parseDirectPdfPreviewUri, reviewAddress } from "../src/lib/mcp/conversational-mailing";
import { handleMailMyPdfMcpRequest } from "../src/lib/mcp/mcp-handler.server";

const address = { name: "Sarah", line1: "1 Main St", city: "Austin", state: "TX", postal: "78701" };
test("postal corrections require confirmation and advisory outages never become verified", () => {
  const valid = { level: "deliverable" as const, providerSucceeded: true, isDeliverable: true, warnings: [] };
  assert.equal(reviewAddress(address, valid).ready, true);
  const correction = reviewAddress(address, { ...valid, corrections: { postal: "78701-1234" } });
  assert.equal(correction.ready, false);
  assert.equal(correction.suggestedAddress?.postal, "78701-1234");
  assert.equal(reviewAddress(address, { ...valid, providerSucceeded: false }).ready, false);
  assert.equal(reviewAddress(address, { ...valid, level: "provider_unavailable" }).ready, false);
  assert.equal(reviewAddress(address, { ...valid, level: "deliverable_missing_unit" }).ready, false);
});

test("private direct PDF resource identities reject malformed and ambiguous URLs", () => {
  const uri = directPdfPreviewUri("order-1", "a".repeat(64));
  assert.deepEqual(parseDirectPdfPreviewUri(uri), { orderId: "order-1", sha256: "a".repeat(64) });
  for (const bad of [uri + "&sha256=" + "b".repeat(64), uri + "#fragment", uri + "&token=secret", uri.replace("order-1", "a%2Fb"), uri.replace("mailmypdf:", "https:")]) {
    assert.equal(parseDirectPdfPreviewUri(bad), null);
  }
});

test("MCP exposes the conversational prompt and rejects unsupported arguments", async () => {
  const call = async (method: string, params: unknown = {}) => {
    const response = await handleMailMyPdfMcpRequest(new Request("https://mailmypdf.example/api/mcp", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }));
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await call("initialize")).body.result.capabilities.prompts.listChanged, false);
  assert.equal((await call("prompts/list")).body.result.prompts[0].name, "mail_this");
  const prompt = (await call("prompts/get", { name: "mail_this" })).body.result.messages[0].content.text;
  assert.match(prompt, /Never silently change an address/);
  assert.match(prompt, /Checkout is not payment or mailing/);
  assert.equal((await call("prompts/get", { name: "mail_this", arguments: { instruction: "send immediately" } })).status, 400);
  assert.equal((await call("prompts/get", { name: "unknown" })).status, 400);
  assert.equal((await call("resources/read", { uri: directPdfPreviewUri("order-1", "a".repeat(64)) })).status, 401);
});

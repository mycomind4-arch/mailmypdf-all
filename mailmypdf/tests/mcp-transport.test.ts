import assert from "node:assert/strict";
import test from "node:test";
import { handleMailMyPdfMcpRequest as handle } from "../src/lib/mcp/mcp-handler.server";

const url = "https://mailmypdf.mycomind4.workers.dev/api/mcp";
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
test("legacy ChatGPT/Claude handshake negotiates supported revisions only", async () => {
  for (const version of ["2025-03-26", "2025-06-18", "2025-11-25", "2099-01-01"]) {
    const response = await handle(request({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: version } }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result.protocolVersion, version === "2099-01-01" ? "2025-11-25" : version);
  }
  assert.equal((await handle(request({ jsonrpc: "2.0", method: "notifications/initialized" }))).status, 202);
});
test("legacy discovery returns the full catalog and OAuth errors preserve request id", async () => {
  const response = await handle(request({ jsonrpc: "2.0", id: 9, method: "tools/list" }));
  assert.equal((await response.json()).result.tools.length, 26);
  const protectedCall = await handle(request({ jsonrpc: "2.0", id: 42, method: "tools/call", params: { name: "get_profile", arguments: {} } }));
  assert.equal(protectedCall.status, 401);
  assert.equal((await protectedCall.json()).id, 42);
  assert.match(protectedCall.headers.get("www-authenticate")!, /resource_metadata=/);
  assert.equal(protectedCall.headers.get("cache-control"), "no-store");
});
test("malformed requests and notifications cannot execute tools", async () => {
  for (const body of [null, [], 1, "hello", { jsonrpc: "2.0", id: {}, method: "ping" }, { jsonrpc: "2.0", id: 1, method: "ping", params: null }, { jsonrpc: "2.0", method: "tools/call", params: { name: "approve_packet" } }]) {
    assert.equal((await handle(request(body))).status, 400);
  }
  assert.equal((await handle(new Request(url, { method: "POST", body: "{" }))).status, 400);
  assert.equal((await handle(request({ padding: "a".repeat(1024 * 1024) }))).status, 413);
});
test("Origin validation blocks untrusted sites and literal null", async () => {
  for (const origin of ["null", "https://attacker.example", "https://chatgpt.com.attacker.example"]) {
    assert.equal((await handle(request({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin }))).status, 403);
  }
  for (const origin of [new URL(url).origin, "https://chatgpt.com", "https://claude.ai"]) {
    assert.equal((await handle(request({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin }))).status, 200);
  }
});
test("modern protocol verifies metadata and rejects unknown versions", async () => {
  const body = { jsonrpc: "2.0", id: 1, method: "ping", params: { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } } };
  const headers = { "mcp-protocol-version": "2026-07-28", "mcp-method": "ping" };
  assert.equal((await handle(request(body, headers))).status, 200);
  assert.equal((await handle(request({ ...body, params: {} }, headers))).status, 400);
  const unsupported = await handle(request(body, { ...headers, "mcp-protocol-version": "2099-01-01" }));
  assert.equal(unsupported.status, 400);
  const error = (await unsupported.json()).error;
  assert.equal(error.code, -32022);
  assert.ok(error.data.supported.includes("2025-11-25"));
});

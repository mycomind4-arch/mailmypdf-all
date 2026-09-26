#!/usr/bin/env node

const baseUrl = (process.env.MCP_BASE_URL || process.argv[2] || "http://127.0.0.1:3000")
  .replace(/\/$/, "");
const endpoint = `${baseUrl}/api/mcp`;
const protectedResource = `${baseUrl}/.well-known/oauth-protected-resource`;
const token = process.env.MCP_BEARER_TOKEN?.trim() || null;

let nextId = 1;

function fail(message, details) {
  console.error(`❌ ${message}`);
  if (details !== undefined) console.error(details);
  process.exit(1);
}

function ok(message) {
  console.log(`✅ ${message}`);
}

async function jsonResponse(response, label) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    fail(`${label} returned non-JSON`, text.slice(0, 1000));
  }
  return body;
}

async function rpc(method, params, options = {}) {
  const headers = new Headers({
    "content-type": "application/json",
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": method,
  });
  if (options.name) headers.set("mcp-name", options.name);
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nextId++,
      method,
      ...(params ? { params } : {}),
    }),
  });

  return { response, body: await jsonResponse(response, method) };
}

console.log(`MailMyPDF MCP smoke test: ${endpoint}`);

{
  const response = await fetch(endpoint);
  if (response.status !== 405) fail("GET /api/mcp must remain POST-only", response.status);
  ok("endpoint is reachable and POST-only");
}

{
  const response = await fetch(protectedResource);
  if (![200, 503].includes(response.status)) {
    fail("protected-resource metadata returned unexpected status", response.status);
  }
  const body = await jsonResponse(response, "protected resource metadata");
  if (!body || typeof body !== "object") fail("protected-resource metadata is missing");
  if (response.status === 200) {
    if (!Array.isArray(body.authorization_servers) || body.authorization_servers.length < 1) {
      fail("protected-resource metadata does not advertise an authorization server", body);
    }
    ok("OAuth protected-resource metadata is configured");
  } else {
    console.warn("⚠️ OAuth protected-resource metadata is not configured on this deployment");
  }
}

{
  const { response, body } = await rpc("server/discover");
  if (!response.ok) fail("server/discover failed", body);
  if (body?.result?.protocolVersion !== "2026-07-28") {
    fail("server/discover returned an unexpected protocol version", body);
  }
  if (body?.result?.serverInfo?.name !== "MailMyPDF") {
    fail("server/discover returned unexpected server identity", body);
  }
  ok("server/discover");
}

let tools = [];
{
  const { response, body } = await rpc("tools/list");
  if (!response.ok) fail("tools/list failed", body);
  tools = body?.result?.tools ?? [];
  const names = new Set(tools.map((tool) => tool.name));

  for (const required of [
    "find_workflow",
    "get_workflow",
    "create_matter",
    "ingest_document",
    "get_document_status",
    "analyze_matter",
    "generate_draft",
    "preview_packet",
    "approve_packet",
    "prepare_checkout",
    "get_order_status",
  ]) {
    if (!names.has(required)) fail(`tools/list is missing ${required}`);
  }

  if (tools.length !== 15) {
    fail(`expected 15 MCP tools, found ${tools.length}`);
  }

  ok("tools/list exposes the expected 15-tool surface");
}

{
  const { response, body } = await rpc(
    "tools/call",
    { name: "find_workflow", arguments: { query: "IRS CP14 notice", limit: 8 } },
    { name: "find_workflow" },
  );
  if (!response.ok) fail("public find_workflow call failed", body);
  const workflows = body?.result?.structuredContent?.workflows ?? [];
  if (!workflows.some((workflow) => workflow.workflowId === "cp14-response")) {
    fail("find_workflow did not resolve CP14", workflows);
  }
  ok("public workflow discovery resolves CP14");
}

{
  const { response, body } = await rpc(
    "tools/call",
    { name: "get_profile", arguments: {} },
    { name: "get_profile" },
  );
  if (response.status !== 401) {
    fail("protected tool did not require account connection", { status: response.status, body });
  }
  const challenge = response.headers.get("www-authenticate") || "";
  if (!challenge.includes("resource_metadata=")) {
    fail("protected tool OAuth challenge is missing resource_metadata", challenge);
  }
  ok("protected tools require OAuth and advertise resource metadata");
}

if (token) {
  const { response, body } = await rpc(
    "tools/call",
    { name: "get_profile", arguments: {} },
    { name: "get_profile", token },
  );
  if (!response.ok) fail("authenticated get_profile failed", body);

  const profile = body?.result?.structuredContent?.profile;
  if (!profile?.id) fail("authenticated get_profile returned no user id", body);
  ok(`authenticated profile resolved (${profile.email || profile.id})`);
} else {
  console.log("ℹ️ MCP_BEARER_TOKEN not set; authenticated smoke check skipped");
}

console.log("\n✅ MailMyPDF MCP smoke test passed");

import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { getMcpTool, MCP_PROTECTED_TOOL_NAMES } from "../src/lib/mcp/tool-catalog";
import {
  RecoveryCaseError,
  type RecoveryCasePersistence,
  type StoredRecoveryCase,
} from "../src/lib/mcp/recovery-case-service";
const owner = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002";
let userId = owner,
  authenticated = true,
  storeCalls = 0;
class AuthenticationError extends Error {}
mock.module("../src/lib/secure-core/auth.server.ts", {
  namedExports: {
    AuthenticationError,
    requireAuthenticatedUser: async () => {
      if (!authenticated) throw new AuthenticationError("Sign in");
      return { user: { id: userId }, supabase: {} };
    },
  },
});
const rows = new Map<string, StoredRecoveryCase>();
const store: RecoveryCasePersistence = {
  async create(input) {
    rows.set(input.goal.id, structuredClone(input));
    return { stored: input, replayed: false };
  },
  async loadOwned(user, id) {
    const row = rows.get(id);
    return row?.goal.ownerId === user ? structuredClone(row) : undefined;
  },
  async listOwned(user, limit) {
    return [...rows.values()].filter((r) => r.goal.ownerId === user).slice(0, limit);
  },
  async assertOwnedReferences() {},
  async save(goal, revision) {
    const row = rows.get(goal.id);
    if (!row || row.goal.revision !== revision)
      throw new RecoveryCaseError(409, "Changed revision");
    row.goal = goal;
    return row;
  },
};
mock.module("../src/lib/mcp/recovery-store.server.ts", {
  namedExports: {
    createRecoveryCaseStore: () => {
      storeCalls++;
      return store;
    },
  },
});
const { executeMcpTool, McpToolExecutionError } =
  await import("../src/lib/mcp/workflow-tools.server");
const { handleMailMyPdfMcpRequest } = await import("../src/lib/mcp/mcp-handler.server");
const req = (name: string, args: unknown) =>
  new Request("https://mailmypdf.test/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
const tx = (id: string) => ({
  id,
  accountId: "alias",
  merchant: "Merchant",
  amountMinor: 8900,
  currency: "USD",
  postedAt: "2026-10-04T08:00:00Z",
  state: "settled",
  kind: "debit",
});
const saveArgs = () => ({
  transactions: [tx("one"), tx("two")],
  candidate_id: "duplicate:one",
  desired_outcome: "Refund extra charge",
  user_confirmed_save: true,
  idempotency_key: "create-one",
});
beforeEach(() => {
  rows.clear();
  userId = owner;
  authenticated = true;
  storeCalls = 0;
});
test("case tools publish owned lifecycle schemas with no provider send or approval capability", () => {
  for (const name of [
    "save_recovery_case",
    "get_recovery_case",
    "list_recovery_cases",
    "update_recovery_case",
  ]) {
    const tool = getMcpTool(name);
    assert.ok(tool);
    assert.equal(MCP_PROTECTED_TOOL_NAMES.has(name), true);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(
      tool.annotations.readOnlyHint,
      name === "get_recovery_case" || name === "list_recovery_cases",
    );
    assert.equal(tool._meta?.["openai/outputTemplate"], "ui://mailmypdf/recovery-case-v1.html");
    assert.deepEqual((tool._meta?.ui as { visibility: string[] }).visibility, ["model", "app"]);
  }
});
test("authenticated save/get/list/update journey preserves case identity and blocks stale updates", async () => {
  const created = (await executeMcpTool(req("save_recovery_case", {}), "save_recovery_case", {
    transactions: [tx("one"), tx("two")],
    candidate_id: "duplicate:one",
    desired_outcome: "Refund extra charge",
    user_confirmed_save: true,
    idempotency_key: "create-one",
  })) as { case: { id: string; state: string }; externalActionsAuthorized: boolean };
  const caseId = created.case.id;
  assert.equal(created.case.state, "intake");
  assert.equal(created.externalActionsAuthorized, false);
  const response = await handleMailMyPdfMcpRequest(req("get_recovery_case", { case_id: caseId }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.result.structuredContent.case.id, caseId);
  const listed = (await executeMcpTool(
    req("list_recovery_cases", {}),
    "list_recovery_cases",
    {},
  )) as { cases: unknown[] };
  assert.equal(listed.cases.length, 1);
  await executeMcpTool(req("update_recovery_case", {}), "update_recovery_case", {
    case_id: caseId,
    expected_revision: 1,
    event: { type: "activate" },
  });
  await assert.rejects(
    executeMcpTool(req("update_recovery_case", {}), "update_recovery_case", {
      case_id: caseId,
      expected_revision: 1,
      event: { type: "cancel" },
    }),
    (e) => e instanceof McpToolExecutionError && e.status === 409,
  );
});
test("other owners cannot retrieve a saved case and invalid requests are safe tool errors", async () => {
  const created = (await executeMcpTool(
    req("save_recovery_case", {}),
    "save_recovery_case",
    saveArgs(),
  )) as { case: { id: string } };
  const caseId = created.case.id;
  userId = other;
  try {
    await assert.rejects(
      executeMcpTool(req("get_recovery_case", {}), "get_recovery_case", { case_id: caseId }),
      (e) => e instanceof McpToolExecutionError && e.status === 404,
    );
    const listed = (await executeMcpTool(
      req("list_recovery_cases", {}),
      "list_recovery_cases",
      {},
    )) as { cases: unknown[] };
    assert.equal(listed.cases.length, 0);
  } finally {
    userId = owner;
  }
  await assert.rejects(
    executeMcpTool(req("list_recovery_cases", {}), "list_recovery_cases", { limit: 1000 }),
    (e) => e instanceof McpToolExecutionError && e.status === 400,
  );
});
test("unauthenticated calls return an OAuth challenge before storage is created", async () => {
  authenticated = false;
  const count = storeCalls;
  try {
    for (const name of [
      "save_recovery_case",
      "get_recovery_case",
      "list_recovery_cases",
      "update_recovery_case",
    ]) {
      const response = await handleMailMyPdfMcpRequest(req(name, {}));
      assert.equal(response.status, 401);
      assert.match(response.headers.get("www-authenticate")!, /resource_metadata/);
    }
    assert.equal(storeCalls, count);
  } finally {
    authenticated = true;
  }
});

test("saved case UI is discoverable as a static resource and contains no private case data", async () => {
  const request = (method: string, params: unknown = {}) =>
    new Request("https://mailmypdf.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  const resources = (await (await handleMailMyPdfMcpRequest(request("resources/list"))).json())
    .result.resources;
  assert.ok(
    resources.some((r: { uri: string }) => r.uri === "ui://mailmypdf/recovery-case-v1.html"),
  );
  const resource = await handleMailMyPdfMcpRequest(
    request("resources/read", { uri: "ui://mailmypdf/recovery-case-v1.html" }),
  );
  assert.equal(resource.status, 200);
  const contents = (await resource.json()).result.contents;
  assert.equal(contents[0].mimeType, "text/html;profile=mcp-app");
  assert.equal(contents[0].text.includes(owner), false);
  assert.deepEqual(contents[0]._meta.ui.csp.connectDomains, []);
});

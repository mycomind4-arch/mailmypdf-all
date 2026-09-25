import assert from "node:assert/strict";
import test from "node:test";

import {
  MAILMYPDF_MCP_TOOLS,
  MCP_PROTECTED_TOOL_NAMES,
} from "../src/lib/mcp/tool-catalog";
import {
  findWorkflowMatches,
  getWorkflowDescriptor,
} from "../src/lib/mcp/workflow-catalog";

test("MCP tool surface stays focused and separates approval from checkout", () => {
  const names = MAILMYPDF_MCP_TOOLS.map((tool) => tool.name);

  assert.ok(names.includes("find_workflow"));
  assert.ok(names.includes("create_matter"));
  assert.ok(names.includes("generate_draft"));
  assert.ok(names.includes("preview_packet"));
  assert.ok(names.includes("approve_packet"));
  assert.ok(names.includes("prepare_checkout"));
  assert.ok(!names.includes("charge_card"));
  assert.ok(!names.includes("submit_mail_order"));
  assert.ok(names.length <= 15);
});

test("public discovery tools do not require account authorization", () => {
  const publicTools = MAILMYPDF_MCP_TOOLS
    .filter((tool) => tool.securitySchemes.some((scheme) => scheme.type === "noauth"))
    .map((tool) => tool.name);

  assert.deepEqual(publicTools.sort(), ["find_workflow", "get_workflow"]);
  assert.equal(MCP_PROTECTED_TOOL_NAMES.has("create_matter"), true);
  assert.equal(MCP_PROTECTED_TOOL_NAMES.has("approve_packet"), true);
});

test("packet approval declares the exact immutable review inputs", () => {
  const approval = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "approve_packet");
  assert.ok(approval);

  const required = (approval.inputSchema.required ?? []) as string[];
  assert.ok(required.includes("expected_packet_sha256"));
  assert.ok(required.includes("expected_total_cents"));
  assert.ok(required.includes("recipient"));
  assert.ok(required.includes("mail_class"));
});

test("workflow discovery resolves canonical workflow and section ids", () => {
  const cp14 = getWorkflowDescriptor("cp14-response");
  assert.ok(cp14);
  assert.equal(cp14.sectionId, "notice-respond");
  assert.equal(cp14.workflowId, "cp14-response");

  const matches = findWorkflowMatches("IRS CP14 notice", 8);
  assert.ok(matches.some((match) => match.workflowId === "cp14-response"));
});

test("secured-transactions workflows are discoverable through the same connector catalog", () => {
  const matches = findWorkflowMatches("secured transaction priority", 20);
  assert.ok(matches.some((match) => match.sectionId === "secured-transactions"));
});

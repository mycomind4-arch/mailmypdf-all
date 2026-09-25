import assert from "node:assert/strict";
import test from "node:test";

import {
  MAILMYPDF_MCP_TOOLS,
  MCP_OAUTH_SCOPES,
  MCP_PROTECTED_TOOL_NAMES,
} from "../src/lib/mcp/tool-catalog";
import { normalizeOrderStatus } from "../src/lib/mcp/order-status.server";
import {
  downloadAssistantFile,
  validateRemoteDocumentUrl,
} from "../src/lib/mcp/remote-document.server";
import {
  findWorkflowMatches,
  getWorkflowDescriptor,
} from "../src/lib/mcp/workflow-catalog";
import { classifyDocumentReadiness } from "../src/lib/mcp/workflow-tools.server";

test("MCP tool surface stays focused and separates approval from checkout", () => {
  const names = MAILMYPDF_MCP_TOOLS.map((tool) => tool.name);

  assert.ok(names.includes("find_workflow"));
  assert.ok(names.includes("create_matter"));
  assert.ok(names.includes("ingest_document"));
  assert.ok(names.includes("get_order_status"));
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


test("protected tools request only OAuth scopes Supabase can issue", () => {
  assert.deepEqual([...MCP_OAUTH_SCOPES], ["email", "profile"]);

  const protectedScopes = new Set(
    MAILMYPDF_MCP_TOOLS.flatMap((tool) =>
      tool.securitySchemes.flatMap((scheme) =>
        scheme.type === "oauth2" ? [...scheme.scopes] : [],
      ),
    ),
  );

  assert.deepEqual([...protectedScopes].sort(), ["email", "profile"]);
  for (const unsupported of ["matter:write", "mail:approve", "documents:write"]) {
    assert.equal(protectedScopes.has(unsupported), false);
  }
});


test("ingest_document exposes the exact ChatGPT file-parameter shape", () => {
  const ingest = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "ingest_document");
  assert.ok(ingest);
  assert.deepEqual(ingest._meta?.["openai/fileParams"], ["file"]);

  const input = ingest.inputSchema as {
    properties: Record<string, {
      properties?: Record<string, unknown>;
      required?: string[];
    }>;
  };
  const file = input.properties.file;
  assert.ok(file);
  assert.deepEqual(
    Object.keys(file.properties ?? {}).sort(),
    ["download_url", "file_id", "file_name", "mime_type"],
  );
  assert.deepEqual([...(file.required ?? [])].sort(), ["download_url", "file_id"]);
});

test("remote attachment URLs reject local/private/nonstandard targets", () => {
  assert.throws(() => validateRemoteDocumentUrl("http://files.example.com/file.pdf"), /public HTTPS/i);
  assert.throws(() => validateRemoteDocumentUrl("https://127.0.0.1/file.pdf"), /public HTTPS|public DNS/i);
  assert.throws(() => validateRemoteDocumentUrl("https://host.local/file.pdf"), /public DNS/i);
  assert.throws(() => validateRemoteDocumentUrl("https://files.example.com:8443/file.pdf"), /standard HTTPS port/i);
  assert.throws(
    () => validateRemoteDocumentUrl("https://other.example.com/file.pdf", ["files.example.com"]),
    /not allowed/i,
  );

  const accepted = validateRemoteDocumentUrl(
    "https://files.example.com/file.pdf",
    ["files.example.com"],
  );
  assert.equal(accepted.hostname, "files.example.com");
});

test("assistant PDF download preserves provider provenance without trusting MIME alone", async () => {
  const pdf = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n";
  const downloaded = await downloadAssistantFile(
    {
      download_url: "https://files.example.com/cp14",
      file_id: "file_cp14",
      mime_type: "application/pdf",
      file_name: "cp14-notice.pdf",
    },
    {
      allowedHostPatterns: ["files.example.com"],
      fetchImpl: async () =>
        new Response(pdf, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        }),
    },
  );

  assert.equal(downloaded.file.name, "cp14-notice.pdf");
  assert.equal(downloaded.file.type, "application/pdf");
  assert.equal(downloaded.sourceFileId, "file_cp14");
  assert.equal(downloaded.sourceHost, "files.example.com");
  assert.ok(downloaded.file.size > 0);
});

test("assistant file redirects are revalidated before following", async () => {
  await assert.rejects(
    () =>
      downloadAssistantFile(
        {
          download_url: "https://files.example.com/start",
          file_id: "file_redirect",
        },
        {
          allowedHostPatterns: [],
          fetchImpl: async () =>
            new Response(null, {
              status: 302,
              headers: { location: "https://127.0.0.1/internal" },
            }),
        },
      ),
    /public HTTPS|public DNS/i,
  );
});


test("get_document_status is read-only and requires matter plus document identity", () => {
  const statusTool = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "get_document_status");
  assert.ok(statusTool);
  assert.equal(statusTool.annotations.readOnlyHint, true);
  assert.equal(statusTool.annotations.destructiveHint, false);
  assert.equal(statusTool.annotations.openWorldHint, false);

  const schema = statusTool.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.deepEqual(Object.keys(schema.properties ?? {}).sort(), ["document_id", "matter_id"]);
  assert.deepEqual([...(schema.required ?? [])].sort(), ["document_id", "matter_id"]);
  assert.equal(MCP_PROTECTED_TOOL_NAMES.has("get_document_status"), true);
});

test("document readiness fails closed until a clean usable document exists", () => {
  assert.equal(classifyDocumentReadiness("quarantined", false), "pending_scan");
  assert.equal(classifyDocumentReadiness("scanning", false), "pending_scan");
  assert.equal(classifyDocumentReadiness("clean", false), "pending_scan");
  assert.equal(classifyDocumentReadiness("clean", true), "ready");
  assert.equal(classifyDocumentReadiness("rejected", false), "rejected");
  assert.equal(classifyDocumentReadiness("deleting", false), "unavailable");
  assert.equal(classifyDocumentReadiness("deleted", false), "unavailable");
});

test("get_order_status is read-only and supports order or matter lookup", () => {
  const statusTool = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "get_order_status");
  assert.ok(statusTool);
  assert.equal(statusTool.annotations.readOnlyHint, true);
  assert.equal(statusTool.annotations.destructiveHint, false);
  assert.equal(statusTool.annotations.openWorldHint, false);

  const schema = statusTool.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.deepEqual(Object.keys(schema.properties ?? {}).sort(), ["matter_id", "order_id"]);
  assert.deepEqual(schema.required ?? [], []);
  assert.equal(MCP_PROTECTED_TOOL_NAMES.has("get_order_status"), true);
});

test("order status normalization exposes tracking facts without raw event metadata", () => {
  const normalized = normalizeOrderStatus(
    {
      id: "order-1",
      status: "in_transit",
      workflow_case_id: "matter-1",
      case_approval_id: "approval-1",
      approved_packet_sha256: "a".repeat(64),
      approved_price_cents: 1299,
      price_cents: 1399,
      mail_class: "certified",
      lob_letter_id: "ltr_123",
      mailed_at: "2026-09-25T12:00:00.000Z",
      paid_at: "2026-09-25T11:00:00.000Z",
      created_at: "2026-09-25T10:00:00.000Z",
      updated_at: "2026-09-25T13:00:00.000Z",
      scheduled_delivery_date: null,
      recipient_name: "Example Recipient",
      recipient_city: "Sacramento",
      recipient_state: "CA",
      file_name: "cp14-response.pdf",
      page_count: 3,
      vertical_slug: "notice-respond",
      email: "owner@example.com",
    },
    [
      {
        type: "lob.submitted",
        label: "Submitted to Lob for printing & mailing",
        created_at: "2026-09-25T11:30:00.000Z",
        metadata: {
          tracking_number: "9400111899223856928499",
          expected_delivery_date: "2026-09-29",
          secret_provider_payload: "must-not-leak",
        },
      },
      {
        type: "lob.letter.in_transit",
        label: "In Transit",
        created_at: "2026-09-25T13:00:00.000Z",
        metadata: { external_id: "evt_private" },
      },
    ],
  );

  assert.equal(normalized.amountCents, 1299);
  assert.equal(normalized.paid, true);
  assert.equal(normalized.tracking.trackingNumber, "9400111899223856928499");
  assert.equal(normalized.timing.expectedDeliveryDate, "2026-09-29");
  assert.deepEqual(normalized.history[0], {
    type: "lob.submitted",
    label: "Submitted to Lob for printing & mailing",
    recordedAt: "2026-09-25T11:30:00.000Z",
  });
  assert.equal(JSON.stringify(normalized).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(normalized).includes("evt_private"), false);
});

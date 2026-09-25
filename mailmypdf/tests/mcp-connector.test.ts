import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
import { classifyDocumentReadiness } from "../src/lib/mcp/document-readiness";
import { handleMailMyPdfMcpRequest } from "../src/lib/mcp/mcp-handler.server";

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
  assert.ok(names.includes("ingest_direct_pdf"));
  assert.ok(names.includes("prepare_direct_pdf_mail"));
  assert.ok(names.includes("approve_direct_pdf_mail"));
  assert.ok(names.includes("prepare_direct_pdf_checkout"));
  assert.ok(!names.includes("charge_card"));
  assert.ok(!names.includes("submit_mail_order"));
  assert.ok(names.length <= 20);
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

test("direct PDF ingestion uses the same assistant file parameter contract", () => {
  const ingest = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "ingest_direct_pdf");
  assert.ok(ingest);
  assert.deepEqual(ingest._meta?.["openai/fileParams"], ["file"]);

  const schema = ingest.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.deepEqual(Object.keys(schema.properties ?? {}).sort(), ["file", "processing_consent"]);
  assert.deepEqual([...(schema.required ?? [])].sort(), ["file", "processing_consent"]);
});

test("direct PDF mailing keeps preparation, approval, and checkout as separate tools", () => {
  const prepare = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "prepare_direct_pdf_mail");
  const approve = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "approve_direct_pdf_mail");
  const checkout = MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === "prepare_direct_pdf_checkout");
  assert.ok(prepare);
  assert.ok(approve);
  assert.ok(checkout);

  const approveRequired = (approve.inputSchema.required ?? []) as string[];
  assert.deepEqual([...approveRequired].sort(), [
    "expected_color",
    "expected_mail_class",
    "expected_packet_sha256",
    "expected_recipient",
    "expected_sender",
    "expected_total_cents",
    "order_id",
  ]);
  assert.equal(prepare.annotations.destructiveHint, false);
  assert.equal(approve.annotations.destructiveHint, false);
  assert.equal(checkout.annotations.destructiveHint, false);
  assert.equal(checkout.annotations.openWorldHint, true);
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


test("get_document_status is read-only and supports workflow or standalone secure documents", () => {
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
  assert.deepEqual([...(schema.required ?? [])].sort(), ["document_id"]);
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


function modernMcpRequest(
  method: string,
  params: Record<string, unknown> | undefined = undefined,
  options: { id?: number; name?: string; includeMethodHeader?: boolean } = {},
): Request {
  const headers = new Headers({
    "content-type": "application/json",
    "mcp-protocol-version": "2026-07-28",
  });
  if (options.includeMethodHeader !== false) headers.set("mcp-method", method);
  if (options.name) headers.set("mcp-name", options.name);

  return new Request("https://mailmypdf.ai/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: options.id ?? 1,
      method,
      ...(params ? { params } : {}),
    }),
  });
}

test("modern server/discover advertises the stateless 2026 protocol", async () => {
  const response = await handleMailMyPdfMcpRequest(
    modernMcpRequest("server/discover", undefined, { id: 41 }),
  );
  assert.equal(response.status, 200);

  const payload = await response.json() as {
    jsonrpc: string;
    id: number;
    result: {
      resultType: string;
      protocolVersion: string;
      capabilities: Record<string, unknown>;
      serverInfo: { name: string; version: string };
    };
  };

  assert.equal(payload.jsonrpc, "2.0");
  assert.equal(payload.id, 41);
  assert.equal(payload.result.resultType, "complete");
  assert.equal(payload.result.protocolVersion, "2026-07-28");
  assert.equal(payload.result.serverInfo.name, "MailMyPDF");
  assert.ok(payload.result.capabilities.tools);
});

test("modern requests reject missing or mismatched Mcp-Method routing headers", async () => {
  const missing = await handleMailMyPdfMcpRequest(
    modernMcpRequest("tools/list", undefined, { includeMethodHeader: false }),
  );
  assert.equal(missing.status, 400);
  const missingPayload = await missing.json() as { error: { code: number; message: string } };
  assert.equal(missingPayload.error.code, -32020);
  assert.match(missingPayload.error.message, /Mcp-Method/i);

  const mismatch = modernMcpRequest("tools/list");
  mismatch.headers.set("mcp-method", "server/discover");
  const mismatched = await handleMailMyPdfMcpRequest(mismatch);
  assert.equal(mismatched.status, 400);
  const mismatchPayload = await mismatched.json() as { error: { code: number; message: string } };
  assert.equal(mismatchPayload.error.code, -32020);
});

test("modern tools/list returns deterministic cacheable public tool metadata", async () => {
  const response = await handleMailMyPdfMcpRequest(modernMcpRequest("tools/list"));
  assert.equal(response.status, 200);

  const payload = await response.json() as {
    result: {
      resultType: string;
      tools: Array<{ name: string }>;
      ttlMs: number;
      cacheScope: string;
    };
  };

  assert.equal(payload.result.resultType, "complete");
  assert.equal(payload.result.ttlMs, 300_000);
  assert.equal(payload.result.cacheScope, "public");
  assert.equal(payload.result.tools.length, 19);
  assert.ok(payload.result.tools.some((tool) => tool.name === "ingest_document"));
  assert.ok(payload.result.tools.some((tool) => tool.name === "get_document_status"));
  assert.ok(payload.result.tools.some((tool) => tool.name === "approve_packet"));
  assert.ok(payload.result.tools.some((tool) => tool.name === "prepare_direct_pdf_mail"));
  assert.ok(payload.result.tools.some((tool) => tool.name === "approve_direct_pdf_mail"));
  assert.ok(payload.result.tools.some((tool) => tool.name === "prepare_direct_pdf_checkout"));
});

test("modern tools/call requires matching Mcp-Name and advertises OAuth metadata", async () => {
  const missingName = await handleMailMyPdfMcpRequest(
    modernMcpRequest(
      "tools/call",
      { name: "get_matter", arguments: { matter_id: "matter-test" } },
    ),
  );
  assert.equal(missingName.status, 400);
  const missingNamePayload = await missingName.json() as { error: { code: number } };
  assert.equal(missingNamePayload.error.code, -32020);

  const protectedCall = await handleMailMyPdfMcpRequest(
    modernMcpRequest(
      "tools/call",
      { name: "get_matter", arguments: { matter_id: "matter-test" } },
      { name: "get_matter" },
    ),
  );
  assert.equal(protectedCall.status, 401);
  const challenge = protectedCall.headers.get("www-authenticate") ?? "";
  assert.match(challenge, /^Bearer /);
  assert.match(challenge, /resource_metadata="https:\/\/mailmypdf\.ai\/\.well-known\/oauth-protected-resource"/);
  assert.match(challenge, /scope="email profile"/);
});


test("direct-mail payment and fulfillment keep immutable approval checks downstream", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const paymentWebhook = fs.readFileSync(
    path.join(root, "src/routes/api/public/payments/webhook.ts"),
    "utf8",
  );
  const lob = fs.readFileSync(path.join(root, "src/lib/lob.server.ts"), "utf8");
  const directMail = fs.readFileSync(path.join(root, "src/lib/mcp/direct-mail.server.ts"), "utf8");

  assert.match(paymentWebhook, /order\.approved_price_cents !== null/);
  assert.match(paymentWebhook, /session\.amount_total !== expectedAmount/);

  assert.match(lob, /assertApprovedOrderIntegrity\(order, supabaseAdmin\)/);
  assert.match(lob, /fulfillment\.packet_hash_mismatch/);
  assert.match(lob, /Approved mailing PDF changed after approval/);
  assert.match(lob, /fulfillment\.approval_snapshot_mismatch/);
  assert.match(lob, /Direct-mail details changed after approval/);

  assert.match(directMail, /approved_packet_sha256: currentHash/);
  assert.match(directMail, /approved_price_cents: totalCents/);
  assert.match(directMail, /mailing_snapshot: mailingSnapshot\(order\)/);
  assert.match(
    directMail,
    /JSON\.stringify\(reviewedMailing\) !== JSON\.stringify\(mailingSnapshot\(order\)\)/,
  );
  assert.match(directMail, /idempotency_key/);
  assert.match(directMail, /mcp\.direct_mail\.prepared/);
});


test("interactive MCP ingestion uses the trusted scanner with scheduled fallback semantics", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const directMail = fs.readFileSync(
    path.join(root, "src/lib/mcp/direct-mail.server.ts"),
    "utf8",
  );
  const workflowTools = fs.readFileSync(
    path.join(root, "src/lib/mcp/workflow-tools.server.ts"),
    "utf8",
  );
  const scanner = fs.readFileSync(
    path.join(root, "src/lib/secure-core/scanner.server.ts"),
    "utf8",
  );
  const migration = fs.readFileSync(
    path.join(
      root,
      "supabase/migrations/20260925171500_claim_single_secure_document_for_scan.sql",
    ),
    "utf8",
  );

  assert.match(directMail, /scanQuarantinedDocumentNow\(registered\.id, context\.user\.id\)/);
  assert.match(workflowTools, /scanQuarantinedDocumentNow\(document\.id, context\.user\.id\)/);
  assert.match(scanner, /claim_secure_document_for_scan/);
  assert.match(scanner, /security_status:\s*document\.deletion_requested_at[\s\S]*?quarantined/);

  assert.match(migration, /d\.id = p_document_id/);
  assert.match(migration, /d\.owner_id = p_owner_id/);
  assert.match(migration, /d\.security_status = 'quarantined'/);
  assert.match(
    migration,
    /revoke all on function public\.claim_secure_document_for_scan\(uuid, uuid\)[\s\S]*?from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.claim_secure_document_for_scan\(uuid, uuid\)[\s\S]*?to service_role/,
  );
});

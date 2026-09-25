import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { handleWorkflowRuntimeRequest } from "@/lib/secure-core/workflow-runtime-host.server";
import { McpOrderStatusError, getOwnedOrderStatus } from "./order-status.server";
import {
  McpDirectMailError,
  approveDirectPdfMail,
  getOwnedDocumentStatus,
  ingestDirectPdf,
  prepareDirectPdfCheckout,
  prepareDirectPdfMail,
} from "./direct-mail.server";
import { AssistantFileIngressError, downloadAssistantFile } from "./remote-document.server";
import { classifyDocumentReadiness } from "./document-readiness";
import { findWorkflowMatches, getWorkflowDescriptor } from "./workflow-catalog";

export class McpToolExecutionError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type ToolArguments = Record<string, unknown>;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new McpToolExecutionError(400, `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new McpToolExecutionError(400, `${label} is required`);
  }
  return value.trim();
}

function boundedLimit(value: unknown): number {
  if (value === undefined) return 8;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new McpToolExecutionError(400, "limit must be an integer");
  }
  return Math.max(1, Math.min(20, value));
}

function runtimeRequest(
  request: Request,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Request {
  const url = new URL(path, request.url);
  const authorization = request.headers.get("authorization");
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  if (body !== undefined) headers.set("content-type", "application/json");

  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function callRuntime(
  request: Request,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<unknown> {
  const response = await handleWorkflowRuntimeRequest(runtimeRequest(request, path, method, body));
  const payload = await response.json().catch(() => ({ error: "Workflow runtime returned an unreadable response" }));
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "MailMyPDF workflow runtime rejected the request";
    throw new McpToolExecutionError(response.status, message, payload);
  }
  return payload;
}

async function callRuntimeForm(
  request: Request,
  path: string,
  form: FormData,
): Promise<unknown> {
  const url = new URL(path, request.url);
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const response = await handleWorkflowRuntimeRequest(
    new Request(url, {
      method: "POST",
      headers,
      body: form,
    }),
  );
  const payload = await response.json().catch(() => ({ error: "Workflow runtime returned an unreadable response" }));
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "MailMyPDF workflow runtime rejected the request";
    throw new McpToolExecutionError(response.status, message, payload);
  }
  return payload;
}

function matterWorkflowId(payload: unknown): string {
  const root = object(payload, "matter response");
  const matter = object(root.matter, "matter");
  return requiredString(matter.workflowId, "matter.workflowId");
}

function uploadedDocument(payload: unknown): {
  id: string;
  filename: string;
  sizeBytes: number;
  securityStatus: string;
} {
  const root = object(payload, "document upload response");
  const document = object(root.document, "document");
  const sizeBytes = document.sizeBytes;
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes < 1) {
    throw new McpToolExecutionError(500, "MailMyPDF returned invalid document size metadata");
  }
  return {
    id: requiredString(document.id, "document.id"),
    filename: requiredString(document.filename, "document.filename"),
    sizeBytes,
    securityStatus: requiredString(document.securityStatus, "document.securityStatus"),
  };
}

export async function executeMcpTool(
  request: Request,
  name: string,
  rawArguments: unknown,
): Promise<unknown> {
  const args = object(rawArguments ?? {}, "arguments");

  if (name === "find_workflow") {
    const query = requiredString(args.query, "query");
    return { workflows: findWorkflowMatches(query, boundedLimit(args.limit)) };
  }

  if (name === "get_workflow") {
    const workflowId = requiredString(args.workflow_id, "workflow_id");
    const workflow = getWorkflowDescriptor(workflowId);
    if (!workflow) throw new McpToolExecutionError(404, "Workflow not found");
    return { workflow };
  }

  if (name === "get_profile") {
    const context = await requireAuthenticatedUser(request);
    const metadata = context.user.user_metadata ?? {};
    const fullName =
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.fullName === "string"
          ? metadata.fullName
          : null;

    return {
      profile: {
        id: context.user.id,
        email: context.user.email ?? null,
        fullName,
      },
    };
  }

  if (name === "create_matter") {
    const workflowId = requiredString(args.workflow_id, "workflow_id");
    const sectionId = requiredString(args.section_id, "section_id");
    const workflow = getWorkflowDescriptor(workflowId);
    if (!workflow) throw new McpToolExecutionError(404, "Workflow not found");
    if (workflow.sectionId !== sectionId) {
      throw new McpToolExecutionError(
        409,
        `Workflow ${workflowId} belongs to section ${workflow.sectionId}, not ${sectionId}`,
      );
    }
    return callRuntime(request, "/api/workflow-runtime/matters", "POST", {
      workflowId,
      verticalId: sectionId,
    });
  }

  if (name === "get_order_status") {
    const orderId =
      typeof args.order_id === "string" && args.order_id.trim()
        ? args.order_id.trim()
        : undefined;
    const statusMatterId =
      typeof args.matter_id === "string" && args.matter_id.trim()
        ? args.matter_id.trim()
        : undefined;

    try {
      return {
        order: await getOwnedOrderStatus(request, {
          ...(orderId ? { orderId } : {}),
          ...(statusMatterId ? { matterId: statusMatterId } : {}),
        }),
      };
    } catch (error) {
      if (error instanceof McpOrderStatusError) {
        throw new McpToolExecutionError(error.status, error.message);
      }
      throw error;
    }
  }

  if (name === "ingest_direct_pdf") {
    try {
      return await ingestDirectPdf(request, args.file, args.processing_consent);
    } catch (error) {
      if (error instanceof McpDirectMailError) {
        throw new McpToolExecutionError(error.status, error.message, error.details);
      }
      throw error;
    }
  }

  if (name === "prepare_direct_pdf_mail") {
    try {
      return await prepareDirectPdfMail(request, {
        documentId: args.document_id,
        sender: args.sender,
        recipient: args.recipient,
        mailClass: args.mail_class,
        color: args.color,
        idempotencyKey: args.idempotency_key,
      });
    } catch (error) {
      if (error instanceof McpDirectMailError) {
        throw new McpToolExecutionError(error.status, error.message, error.details);
      }
      throw error;
    }
  }

  if (name === "approve_direct_pdf_mail") {
    try {
      return await approveDirectPdfMail(request, {
        orderId: args.order_id,
        expectedPacketSha256: args.expected_packet_sha256,
        expectedTotalCents: args.expected_total_cents,
        expectedSender: args.expected_sender,
        expectedRecipient: args.expected_recipient,
        expectedMailClass: args.expected_mail_class,
        expectedColor: args.expected_color,
      });
    } catch (error) {
      if (error instanceof McpDirectMailError) {
        throw new McpToolExecutionError(error.status, error.message, error.details);
      }
      throw error;
    }
  }

  if (name === "prepare_direct_pdf_checkout") {
    try {
      return await prepareDirectPdfCheckout(request, args.order_id);
    } catch (error) {
      if (error instanceof McpDirectMailError) {
        throw new McpToolExecutionError(error.status, error.message, error.details);
      }
      throw error;
    }
  }

  if (name === "get_document_status") {
    const documentId = requiredString(args.document_id, "document_id");
    const statusMatterId =
      typeof args.matter_id === "string" && args.matter_id.trim()
        ? args.matter_id.trim()
        : null;

    if (!statusMatterId) {
      try {
        return await getOwnedDocumentStatus(request, documentId);
      } catch (error) {
        if (error instanceof McpDirectMailError) {
          throw new McpToolExecutionError(error.status, error.message, error.details);
        }
        throw error;
      }
    }

    const statusBase = `/api/workflow-runtime/matters/${encodeURIComponent(statusMatterId)}`;
    const matterPayload = object(await callRuntime(request, statusBase, "GET"), "matter response");
    const documents = Array.isArray(matterPayload.documents) ? matterPayload.documents : [];
    const document = documents.find((candidate) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
      return (candidate as Record<string, unknown>).documentId === documentId;
    });

    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new McpToolExecutionError(404, "Document not found on this matter");
    }

    const metadata = document as Record<string, unknown>;
    const securityStatus = requiredString(metadata.securityStatus, "document.securityStatus");
    const usable = metadata.usable === true;
    const readiness = classifyDocumentReadiness(securityStatus, usable);

    return {
      document: {
        documentId,
        filename: typeof metadata.filename === "string" ? metadata.filename : null,
        mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : null,
        sizeBytes: typeof metadata.sizeBytes === "number" ? metadata.sizeBytes : null,
        role: typeof metadata.role === "string" ? metadata.role : null,
        securityStatus,
        usable,
        readiness,
      },
      analysisAllowed: readiness === "ready",
      directMailAllowed: readiness === "ready" && metadata.mimeType === "application/pdf",
      nextAction:
        readiness === "ready"
          ? "The document is clean and may be analyzed."
          : readiness === "rejected"
            ? "The document failed security validation and must not be analyzed. Ask the user for a different file."
            : readiness === "unavailable"
              ? "The document is unavailable and must be replaced before analysis."
              : "The document is still in quarantine or scanning. Check this status again before analysis.",
    };
  }

  const matterId = requiredString(args.matter_id, "matter_id");
  const base = `/api/workflow-runtime/matters/${encodeURIComponent(matterId)}`;

  if (name === "get_matter") {
    return callRuntime(request, base, "GET");
  }

  if (name === "ingest_document") {
    if (args.processing_consent !== true) {
      throw new McpToolExecutionError(
        400,
        "processing_consent must be true after the user explicitly asks MailMyPDF to process the attachment",
      );
    }

    const role = requiredString(args.role, "role");
    if (role !== "subject_notice" && role !== "evidence") {
      throw new McpToolExecutionError(400, "role must be subject_notice or evidence");
    }

    const evidenceKind =
      args.evidence_kind === null || args.evidence_kind === undefined
        ? null
        : requiredString(args.evidence_kind, "evidence_kind");
    const position = args.position;
    if (
      position !== undefined &&
      (typeof position !== "number" || !Number.isInteger(position) || position < 0)
    ) {
      throw new McpToolExecutionError(400, "position must be a non-negative integer");
    }

    // Confirm matter ownership and derive the workflow id before any remote
    // network access. This prevents a valid account token from using the file
    // downloader independently of an owner-scoped MailMyPDF matter.
    const matterPayload = await callRuntime(request, base, "GET");
    const workflowId = matterWorkflowId(matterPayload);

    let downloaded;
    try {
      downloaded = await downloadAssistantFile(args.file);
    } catch (error) {
      if (error instanceof AssistantFileIngressError) {
        throw new McpToolExecutionError(400, error.message, { code: error.code });
      }
      throw error;
    }

    const form = new FormData();
    form.set("file", downloaded.file);
    form.set("workflowId", workflowId);
    form.set("purpose", "assistant-attachment");
    form.set("consent", "true");

    const uploadPayload = await callRuntimeForm(
      request,
      "/api/workflow-runtime/documents",
      form,
    );
    const document = uploadedDocument(uploadPayload);

    const attachedPayload = await callRuntime(request, `${base}/documents`, "POST", {
      documentId: document.id,
      role,
      evidenceKind,
      ...(typeof position === "number" ? { position } : {}),
    });

    return {
      document: {
        ...document,
        role,
        evidenceKind,
        sourceFileId: downloaded.sourceFileId,
        sourceHost: downloaded.sourceHost,
        sourceMimeType: downloaded.sourceMimeType,
      },
      attached: attachedPayload,
      nextAction:
        document.securityStatus === "clean"
          ? "The document is cleared for workflow analysis."
          : "The document is quarantined. Call get_document_status until MailMyPDF marks it clean before analysis.",
    };
  }

  if (name === "save_matter_input") {
    return callRuntime(request, `${base}/input`, "POST", object(args.input, "input"));
  }

  if (name === "analyze_matter") {
    return callRuntime(request, `${base}/analysis`, "POST", {});
  }

  if (name === "generate_draft") {
    return callRuntime(request, `${base}/draft/generate`, "POST", {});
  }

  if (name === "save_draft") {
    return callRuntime(request, `${base}/draft`, "POST", {
      bodyText: requiredString(args.body_text, "body_text"),
    });
  }

  if (name === "preview_packet") {
    return callRuntime(request, `${base}/packet`, "POST", {
      mailClass: requiredString(args.mail_class, "mail_class"),
    });
  }

  if (name === "approve_packet") {
    const total = args.expected_total_cents;
    if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
      throw new McpToolExecutionError(400, "expected_total_cents must be a non-negative integer");
    }
    return callRuntime(request, `${base}/approval`, "POST", {
      expectedPacketSha256: requiredString(args.expected_packet_sha256, "expected_packet_sha256"),
      expectedTotalCents: total,
      recipient: object(args.recipient, "recipient"),
      mailClass: requiredString(args.mail_class, "mail_class"),
    });
  }

  if (name === "prepare_checkout") {
    return callRuntime(request, `${base}/checkout`, "POST", {
      approvalId: requiredString(args.approval_id, "approval_id"),
      sender: object(args.sender, "sender"),
    });
  }

  throw new McpToolExecutionError(404, `Unknown MCP tool: ${name}`);
}

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
import { RecipientReviewError, recipientReviewSha256 } from "./packet-review";
import { createPacketPreviewResourceUri } from "./packet-preview-resource";
import { findWorkflowMatches, getWorkflowDescriptor } from "./workflow-catalog";
import { hashRecord } from "@/lib/proof-of-service/hashing";
import {
  assessMcpToolReadiness,
  getMcpTool,
} from "./tool-catalog";
import { probeMcpToolBindingHealth } from "./connector-binding-health.server";
import {
  executeDurableConnectorOperation,
  getOwnedConnectorOperation,
  publicConnectorOperation,
  type ConnectorOperationExecution,
} from "./connector-operations.server";
import {
  ConnectorOperationIdempotencyConflict,
  type ConnectorOperationKind,
} from "@mailmypdf/workflows/connector-operation";

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

function idempotencyKey(value: unknown): string {
  const key = requiredString(value, "idempotency_key");
  if (key.length < 8 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new McpToolExecutionError(
      400,
      "idempotency_key must be 8-128 letters, numbers, periods, underscores, colons, or hyphens",
    );
  }
  return key;
}

export function connectorOperationRequestSha256(args: ToolArguments): string {
  const request = { ...args };
  delete request.idempotency_key;
  if (request.file && typeof request.file === "object" && !Array.isArray(request.file)) {
    const file = { ...(request.file as Record<string, unknown>) };
    // Temporary download URLs commonly rotate between retries. The provider
    // file id and declared file metadata are the stable request identity.
    delete file.download_url;
    request.file = file;
  }
  return hashRecord(request);
}

function operationError(error: unknown) {
  if (error instanceof McpToolExecutionError) {
    const detailCode =
      error.details && typeof error.details === "object" && !Array.isArray(error.details) &&
      "code" in error.details && typeof error.details.code === "string"
        ? error.details.code
        : null;
    return {
      code: detailCode ?? `MCP_TOOL_${error.status}`,
      message: error.message.slice(0, 500),
      retryable: error.status === 408 || error.status === 429 || error.status >= 500,
    };
  }
  return {
    code: "MCP_TOOL_FAILED",
    message: "Connector operation failed.",
    retryable: false,
  };
}

function operationResponse(
  execution: ConnectorOperationExecution<unknown>,
): Record<string, unknown> {
  const operation = publicConnectorOperation(execution.operation, { includeResult: false });
  if (execution.operation.state === "failed" || execution.operation.state === "cancelled") {
    throw new McpToolExecutionError(
      409,
      execution.operation.state === "failed"
        ? "The saved connector operation failed. Check its status before starting another action."
        : "The saved connector operation was cancelled.",
      { connectorOperation: operation, connectorReplay: execution.replayed },
    );
  }
  if (
    execution.output &&
    typeof execution.output === "object" &&
    !Array.isArray(execution.output)
  ) {
    return {
      ...(execution.output as Record<string, unknown>),
      connectorOperation: operation,
      connectorReplay: execution.replayed,
    };
  }
  return {
    connectorOperation: operation,
    connectorReplay: execution.replayed,
    ...(execution.output === undefined ? {} : { output: execution.output }),
  };
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
      id: context.user.id,
      name: fullName,
      email: context.user.email ?? null,
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

  if (name === "get_operation_status") {
    const context = await requireAuthenticatedUser(request);
    const operationId = requiredString(args.operation_id, "operation_id");
    const operation = await getOwnedConnectorOperation(context, operationId);
    if (!operation) throw new McpToolExecutionError(404, "Connector operation not found");
    return { operation: publicConnectorOperation(operation) };
  }

  if (name === "get_connector_readiness") {
    const context = await requireAuthenticatedUser(request);
    const toolName = requiredString(args.tool_name, "tool_name");
    const target = getMcpTool(toolName);
    if (!target) throw new McpToolExecutionError(404, "Connector tool not found");
    const readinessMatterId =
      typeof args.matter_id === "string" && args.matter_id.trim()
        ? args.matter_id.trim()
        : undefined;
    const ownershipRelevant = target.capabilityRequirements.some(
      (requirement) => requirement.requiresOwnership !== false,
    );
    let ownership: "not-applicable" | "verified" | "unverified" =
      ownershipRelevant ? "unverified" : "not-applicable";
    let approvalPresent = false;

    if (readinessMatterId) {
      const readinessBase = `/api/workflow-runtime/matters/${encodeURIComponent(readinessMatterId)}`;
      await callRuntime(request, readinessBase, "GET");
      ownership = "verified";
      const approvalPayload = object(
        await callRuntime(request, `${readinessBase}/approval`, "GET"),
        "approval response",
      );
      approvalPresent = Boolean(approvalPayload.approval);
    }

    const initial = assessMcpToolReadiness(toolName, {
      actor: "authenticated",
      ownership,
      ...(approvalPresent ? { approvedCapabilities: ["approval" as const] } : {}),
    });
    const health = await probeMcpToolBindingHealth({
      context,
      capabilities: initial.resolved,
      ...(readinessMatterId ? { matterId: readinessMatterId } : {}),
    });
    const readiness = assessMcpToolReadiness(toolName, {
      actor: "authenticated",
      ownership,
      ...(approvalPresent ? { approvedCapabilities: ["approval" as const] } : {}),
      bindingHealth: health.bindingHealth,
    });

    return {
      toolName,
      sideEffectsPerformed: false,
      readiness,
      bindingHealth: health.probes,
      checkedAt: health.checkedAt,
    };
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

  const runOperation = async (
    kind: ConnectorOperationKind,
    execute: () => Promise<unknown>,
  ): Promise<Record<string, unknown>> => {
    const context = await requireAuthenticatedUser(request);
    try {
      const execution = await executeDurableConnectorOperation({
        context, kind, matterId,
        idempotencyKey: idempotencyKey(args.idempotency_key),
        requestSha256: connectorOperationRequestSha256(args),
        execute, mapError: operationError,
      });
      return operationResponse(execution);
    } catch (error) {
      if (error instanceof ConnectorOperationIdempotencyConflict) {
        throw new McpToolExecutionError(409, error.message, { code: error.code });
      }
      throw error;
    }
  };

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

    return runOperation("ingest_document", async () => {
      // The durable operation repository verifies matter ownership before this
      // callback runs. Load again through the runtime to derive workflow id;
      // no remote attachment access occurs before both checks pass.
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

      if (document.securityStatus === "quarantined") {
        try {
          const context = await requireAuthenticatedUser(request);
          const { scanQuarantinedDocumentNow } = await import("@/lib/secure-core/scanner.server");
          await scanQuarantinedDocumentNow(document.id, context.user.id);
        } catch {
          // Scheduled scanning remains the fallback; never bypass quarantine.
        }
      }
      const refreshed = await getOwnedDocumentStatus(request, document.id).catch(() => null);
      const securityStatus = refreshed?.document.securityStatus ?? document.securityStatus;
      const readiness = refreshed?.document.readiness ?? classifyDocumentReadiness(securityStatus, false);

      return {
        document: {
          ...document,
          securityStatus,
          readiness,
          role,
          evidenceKind,
          sourceFileId: downloaded.sourceFileId,
          sourceHost: downloaded.sourceHost,
          sourceMimeType: downloaded.sourceMimeType,
        },
        attached: attachedPayload,
        nextAction:
          readiness === "ready"
            ? "The document is cleared for workflow analysis."
            : "The document is quarantined. Call get_document_status until MailMyPDF marks it clean before analysis.",
      };
    });
  }

  if (name === "save_matter_input") {
    return runOperation(
      "save_matter_input",
      () => callRuntime(request, `${base}/input`, "POST", object(args.input, "input")),
    );
  }

  if (name === "analyze_matter") {
    return runOperation(
      "analyze_matter",
      () => callRuntime(request, `${base}/analysis`, "POST", {}),
    );
  }

  if (name === "generate_draft") {
    return runOperation(
      "generate_draft",
      () => callRuntime(request, `${base}/draft/generate`, "POST", {}),
    );
  }

  if (name === "save_draft") {
    const bodyText = requiredString(args.body_text, "body_text");
    return runOperation(
      "save_draft",
      () => callRuntime(request, `${base}/draft`, "POST", { bodyText }),
    );
  }

  if (name === "preview_packet") {
    const selectedMailClass = requiredString(args.mail_class, "mail_class");
    let review;
    try {
      review = await recipientReviewSha256(args.recipient);
    } catch (error) {
      if (error instanceof RecipientReviewError) {
        throw new McpToolExecutionError(400, error.message);
      }
      throw error;
    }

    return runOperation("preview_packet", async () => {
      const packetPayload = object(
        await callRuntime(request, `${base}/packet`, "POST", {
          mailClass: selectedMailClass,
        }),
        "packet preview response",
      );

      const packet = object(packetPayload.packet, "packet");
      const packetSha256 = requiredString(packet.packetSha256, "packet.packetSha256").toLowerCase();
      const previewResourceUri = createPacketPreviewResourceUri({
        matterId,
        mailClass: selectedMailClass as "standard" | "certified" | "registered",
        packetSha256,
      });

      return {
        ...packetPayload,
        review: {
          matterId,
          mailClass: selectedMailClass,
          recipientSha256: review.sha256,
          previewResourceUri,
        },
      };
    });
  }

  if (name === "approve_packet") {
    const total = args.expected_total_cents;
    if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
      throw new McpToolExecutionError(400, "expected_total_cents must be a non-negative integer");
    }

    let review;
    try {
      review = await recipientReviewSha256(args.recipient);
    } catch (error) {
      if (error instanceof RecipientReviewError) {
        throw new McpToolExecutionError(400, error.message);
      }
      throw error;
    }

    const expectedRecipientSha256 = requiredString(
      args.expected_recipient_sha256,
      "expected_recipient_sha256",
    ).toLowerCase();
    if (review.sha256 !== expectedRecipientSha256) {
      throw new McpToolExecutionError(
        409,
        "Recipient changed after preview; build and review a new packet preview before approval",
        {
          code: "RECIPIENT_REVIEW_CHANGED",
          reviewedRecipientSha256: expectedRecipientSha256,
          currentRecipientSha256: review.sha256,
        },
      );
    }

    const expectedPacketSha256 = requiredString(
      args.expected_packet_sha256,
      "expected_packet_sha256",
    );
    const selectedMailClass = requiredString(args.mail_class, "mail_class");
    return runOperation(
      "approve_packet",
      () => callRuntime(request, `${base}/approval`, "POST", {
        expectedPacketSha256,
        expectedTotalCents: total,
        recipient: review.recipient,
        mailClass: selectedMailClass,
      }),
    );
  }

  if (name === "prepare_checkout") {
    const approvalId = requiredString(args.approval_id, "approval_id");
    const sender = object(args.sender, "sender");
    return runOperation(
      "prepare_checkout",
      () => callRuntime(request, `${base}/checkout`, "POST", { approvalId, sender }),
    );
  }

  throw new McpToolExecutionError(404, `Unknown MCP tool: ${name}`);
}

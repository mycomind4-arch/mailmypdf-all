import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { SavedAddressError, listSavedAddresses, saveAddress, archiveAddress } from "./saved-addresses.server";
import { handleWorkflowRuntimeRequest } from "@/lib/secure-core/workflow-runtime-host.server";
import { McpOrderStatusError, getOwnedOrderStatus } from "./order-status.server";
import {
  McpDirectMailError,
  approveDirectPdfMail,
  getOwnedDocumentStatus,
  ingestDirectPdf,
  prepareDirectPdfCheckout,
  prepareDirectPdfMail,
  prepareConversationalLetterMail,
  reviewDirectPdfMail,
  getMailingContext,
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
  type ConnectorOperation,
  type ConnectorOperationKind,
} from "@mailmypdf/workflows/connector-operation";
import {
  deriveWorkflowProtocolState,
  generatedDraftReviewAction,
  platformWorkflowRuntimePolicyFor,
  type WorkflowMatterDocument,
  type WorkflowMatterRecord,
} from "@mailmypdf/workflows";
import { getMcpWorkflowProtocolRegistration } from "./workflow-protocol.server";
import { bindConnectorCheckoutCorrelation } from "./connector-runtime-correlation.server";
import { listRecentCases } from "@/lib/secure-core/case.server";
import { deriveMatterGuidance } from "./matter-guidance";
import {
  cancelScheduledDirectMail,
  createScheduledDirectMail,
  ScheduledMailError,
} from "@/lib/scheduled-mail.server";
import { BillingProfileError, getPaymentReadiness } from "@/lib/billing-profile.server";
import {
  chargeAndSendDirectPdfMail,
  ImmediateMailError,
} from "@/lib/immediate-mail.server";
import { normalizeDocumentSource } from "@mailmypdf/documents/document-source";

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
  operation?: Pick<ConnectorOperation, "id" | "requestSha256">,
): Request {
  const url = new URL(path, request.url);
  const authorization = request.headers.get("authorization");
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  if (body !== undefined) headers.set("content-type", "application/json");

  const runtime = new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return operation
    ? bindConnectorCheckoutCorrelation(runtime, operation)
    : runtime;
}

async function callRuntime(
  request: Request,
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  operation?: Pick<ConnectorOperation, "id" | "requestSha256">,
): Promise<unknown> {
  const response = await handleWorkflowRuntimeRequest(
    runtimeRequest(request, path, method, body, operation),
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
    const registration = getMcpWorkflowProtocolRegistration(workflow.workflowId);
    return {
      workflow: {
        ...workflow,
        chatExecution: {
          protocol: "mailmypdf.workflow/v1",
          certified: registration?.certification.certified === true,
        },
      },
    };
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

  if (name === "get_payment_readiness") {
    try {
      return await getPaymentReadiness(request);
    } catch (error) {
      if (error instanceof BillingProfileError) {
        throw new McpToolExecutionError(error.status, error.message);
      }
      throw error;
    }
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
    const registration = getMcpWorkflowProtocolRegistration(workflowId);
    if (!registration?.certification.certified || !registration.definition) {
      throw new McpToolExecutionError(
        409,
        `Workflow ${workflowId} is not certified for chat-guided execution.`,
        {
          code: registration
            ? "WORKFLOW_CHAT_READINESS_NOT_CERTIFIED"
            : "WORKFLOW_PROTOCOL_NOT_REGISTERED",
          workflowId,
          ...(registration
            ? { chatReadiness: registration.certification }
            : {}),
        },
      );
    }
    return callRuntime(request, "/api/workflow-runtime/matters", "POST", {
      workflowId,
      verticalId: sectionId,
    });
  }

  if (name === "list_recent_matters") {
    const context = await requireAuthenticatedUser(request);
    const matters = await listRecentCases(boundedLimit(args.limit), context);
    return {
      matters: matters.map((matter) => ({
        matterId: matter.id,
        workflowId: matter.workflow_id,
        sectionId: matter.vertical_id,
        status: matter.status,
        createdAt: matter.created_at,
        updatedAt: matter.updated_at,
      })),
      nextAction:
        matters.length > 0
          ? "Choose the matching matter with the user, then call get_matter for current progress and the safest continuation step."
          : "No matters were found. Use find_workflow before creating a new matter.",
    };
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

  if (["list_saved_addresses", "save_mailing_address", "archive_mailing_address"].includes(name)) {
    try {
      if (name === "list_saved_addresses") return await listSavedAddresses(request, args);
      if (name === "save_mailing_address") return await saveAddress(request, args);
      return await archiveAddress(request, args);
    } catch (error) {
      if (error instanceof SavedAddressError || error instanceof McpDirectMailError) throw new McpToolExecutionError(error.status, error.message);
      throw error;
    }
  }

  if (name === "review_direct_pdf_mail" || name === "get_mailing_context") {
    try {
      return name === "review_direct_pdf_mail"
        ? await reviewDirectPdfMail(request, args.order_id)
        : await getMailingContext(request);
    } catch (error) {
      if (error instanceof McpDirectMailError) throw new McpToolExecutionError(error.status, error.message, error.details);
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

  if (name === "prepare_conversational_letter") {
    try {
      return await prepareConversationalLetterMail(request, {
        letterText: args.letter_text,
        sender: args.sender,
        recipient: args.recipient,
        mailClass: args.mail_class,
        color: args.color,
        idempotencyKey: args.idempotency_key,
        senderProfile: args.sender_profile,
        recipientEntry: args.recipient_entry,
      });
    } catch (error) {
      if (error instanceof McpDirectMailError || error instanceof SavedAddressError) {
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
        senderProfile: args.sender_profile,
        recipientEntry: args.recipient_entry,
      });
    } catch (error) {
      if (error instanceof McpDirectMailError || error instanceof SavedAddressError) {
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

  if (name === "charge_and_send_direct_pdf_mail") {
    try {
      return await chargeAndSendDirectPdfMail(request, {
        orderId: args.order_id,
        expectedPacketSha256: args.expected_packet_sha256,
        expectedTotalCents: args.expected_total_cents,
        expectedPaymentRevision: args.expected_payment_revision,
        authorizeSavedPayment: args.authorize_saved_payment,
        userConfirmedSend: args.user_confirmed_send,
      });
    } catch (error) {
      if (error instanceof ImmediateMailError) {
        throw new McpToolExecutionError(error.status, error.message, {
          ...(error.code ? { code: error.code } : {}),
          ...(error.details ?? {}),
        });
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
    execute: (operation: ConnectorOperation) => Promise<unknown>,
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

  if (name === "get_workflow_state") {
    const matterPayload = object(
      await callRuntime(request, base, "GET"),
      "matter response",
    );
    const storedMatter = object(matterPayload.matter, "matter") as unknown as WorkflowMatterRecord;
    const documents = Array.isArray(matterPayload.documents)
      ? matterPayload.documents as WorkflowMatterDocument[]
      : [];
    const registration = getMcpWorkflowProtocolRegistration(storedMatter.workflowId);
    const definition = registration?.definition ?? null;
    if (!definition) {
      throw new McpToolExecutionError(
        409,
        `Workflow ${storedMatter.workflowId} is not certified for chat-guided execution yet.`,
        {
          code: registration
            ? "WORKFLOW_CHAT_READINESS_NOT_CERTIFIED"
            : "WORKFLOW_PROTOCOL_NOT_REGISTERED",
          workflowId: storedMatter.workflowId,
          ...(registration
            ? { chatReadiness: registration.certification }
            : {}),
        },
      );
    }

    const [analysisPayload, inputPayload, draftPayload, approvalPayload] = await Promise.all([
      callRuntime(request, `${base}/analysis`, "GET"),
      callRuntime(request, `${base}/input`, "GET"),
      callRuntime(request, `${base}/draft`, "GET"),
      callRuntime(request, `${base}/approval`, "GET"),
    ]);

    const analysisPresent = Boolean(object(analysisPayload, "analysis response").analysis);
    const inputPresent = Boolean(object(inputPayload, "input response").input);
    const draftPresent = Boolean(object(draftPayload, "draft response").draft);
    const approvalPresent = Boolean(object(approvalPayload, "approval response").approval);

    let orderPresent = false;
    if (approvalPresent) {
      try {
        await getOwnedOrderStatus(request, { matterId });
        orderPresent = true;
      } catch (error) {
        if (!(error instanceof McpOrderStatusError) || error.status !== 404) throw error;
      }
    }

    return {
      workflowState: deriveWorkflowProtocolState({
        matter: storedMatter,
        documents,
        definition,
        analysisPresent,
        inputPresent,
        draftPresent,
        approvalPresent,
        orderPresent,
      }),
    };
  }

  if (name === "get_matter") {
    const snapshot = object(await callRuntime(request, base, "GET"), "matter response");
    const matter = object(snapshot.matter, "matter");
    const workflowId = requiredString(matter.workflowId, "matter.workflowId");
    const verticalId = requiredString(matter.verticalId, "matter.verticalId");
    const status = requiredString(matter.status, "matter.status");
    const documents = Array.isArray(snapshot.documents) ? snapshot.documents : [];
    const [inputPayload, analysisPayload, draftPayload, approvalPayload] = await Promise.all([
      callRuntime(request, `${base}/input`, "GET"),
      callRuntime(request, `${base}/analysis`, "GET"),
      callRuntime(request, `${base}/draft`, "GET"),
      callRuntime(request, `${base}/approval`, "GET"),
    ]);
    const storedInput = object(inputPayload, "matter input response").input;
    const analysis = object(analysisPayload, "matter analysis response").analysis;
    const draft = object(draftPayload, "matter draft response").draft;
    const approval = object(approvalPayload, "matter approval response").approval;
    const approvalId =
      approval && typeof approval === "object" && !Array.isArray(approval) &&
      typeof (approval as Record<string, unknown>).approvalId === "string"
        ? (approval as Record<string, unknown>).approvalId as string
        : null;
    const policy = platformWorkflowRuntimePolicyFor(workflowId);
    const guidance = deriveMatterGuidance({
      matter: {
        id: requiredString(matter.id, "matter.id"),
        workflowId,
        verticalId,
        status,
      },
      documents: documents.flatMap((candidate) => {
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
        const document = candidate as Record<string, unknown>;
        if (typeof document.documentId !== "string" || typeof document.role !== "string") return [];
        return [{
          documentId: document.documentId,
          role: document.role,
          included: document.included === true,
          securityStatus: typeof document.securityStatus === "string" ? document.securityStatus : "unknown",
          usable: document.usable === true,
        }];
      }),
      requiresSourceDocument: policy?.requiresSourceDocument !== false,
      analysis: analysis ?? null,
      hasInput: Boolean(storedInput),
      hasDraft: Boolean(draft),
      approvalId,
    });
    return { ...snapshot, ...guidance };
  }

  if (name === "schedule_direct_pdf_mail" || name === "cancel_scheduled_mail") {
    try {
      if (name === "schedule_direct_pdf_mail") {
        return await createScheduledDirectMail(request, {
          orderId: args.order_id,
          sendAt: args.send_at,
          timezone: args.timezone,
          idempotencyKey: args.idempotency_key,
          authorizeSavedPayment: args.authorize_saved_payment,
        });
      }
      if (args.user_confirmed !== true) {
        throw new McpToolExecutionError(
          400,
          "user_confirmed must be true after the user explicitly asks to cancel this scheduled mailing",
        );
      }
      return await cancelScheduledDirectMail(request, args.schedule_id);
    } catch (error) {
      if (error instanceof ScheduledMailError) {
        throw new McpToolExecutionError(error.status, error.message, {
          ...(error.code ? { code: error.code } : {}),
        });
      }
      throw error;
    }
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

    const rawSourceKind =
      args.source_kind === undefined ? "conversation_attachment" : requiredString(args.source_kind, "source_kind");
    const allowedSourceKinds = new Set([
      "local_upload",
      "conversation_attachment",
      "google_drive",
      "mailmypdf_library",
      "external_provider",
    ]);
    if (!allowedSourceKinds.has(rawSourceKind)) {
      throw new McpToolExecutionError(400, "source_kind is not supported");
    }
    const sourceProvider =
      args.source_provider === null || args.source_provider === undefined
        ? null
        : requiredString(args.source_provider, "source_provider");
    if (sourceProvider && sourceProvider.length > 80) {
      throw new McpToolExecutionError(400, "source_provider is too long");
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

      const context = await requireAuthenticatedUser(request);
      let provenance;
      try {
        provenance = normalizeDocumentSource({
          kind: rawSourceKind as
            | "local_upload"
            | "conversation_attachment"
            | "google_drive"
            | "mailmypdf_library"
            | "external_provider",
          role: role === "subject_notice" ? "primary" : "supporting",
          sourceId: downloaded.sourceFileId,
          provider:
            rawSourceKind === "google_drive"
              ? "google"
              : rawSourceKind === "mailmypdf_library"
                ? "mailmypdf"
                : sourceProvider,
          fileName: downloaded.file.name,
          mimeType: downloaded.file.type || downloaded.sourceMimeType,
        });
      } catch (error) {
        throw new McpToolExecutionError(
          400,
          error instanceof Error ? error.message : "Document source provenance is invalid",
        );
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: provenanceError } = await supabaseAdmin
        .from("document_source_provenance")
        .upsert(
          {
            document_id: document.id,
            owner_id: context.user.id,
            source_kind: provenance.kind,
            use_role: provenance.role,
            source_provider: provenance.provider,
            source_id: provenance.sourceId,
            imported_at: provenance.importedAt,
          },
          { onConflict: "document_id" },
        );
      if (provenanceError) {
        throw new McpToolExecutionError(
          500,
          "The document was secured but its source provenance could not be recorded",
        );
      }

      if (document.securityStatus === "quarantined") {
        try {
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
          sourceKind: provenance.kind,
          sourceProvider: provenance.provider,
          sourceRole: provenance.role,
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
      async () => ({
        ...object(await callRuntime(request, `${base}/draft/generate`, "POST", {}), "generated draft"),
        nextAction: generatedDraftReviewAction(matterId),
      }),
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
      (operation) => callRuntime(
        request,
        `${base}/checkout`,
        "POST",
        { approvalId, sender },
        operation,
      ),
    );
  }

  throw new McpToolExecutionError(404, `Unknown MCP tool: ${name}`);
}

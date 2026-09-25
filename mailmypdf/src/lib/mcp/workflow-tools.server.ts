import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { handleWorkflowRuntimeRequest } from "@/lib/secure-core/workflow-runtime-host.server";
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

  const matterId = requiredString(args.matter_id, "matter_id");
  const base = `/api/workflow-runtime/matters/${encodeURIComponent(matterId)}`;

  if (name === "get_matter") {
    return callRuntime(request, base, "GET");
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

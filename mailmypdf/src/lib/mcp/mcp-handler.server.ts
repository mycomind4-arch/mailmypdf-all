import { AuthenticationError, requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { getSiteOrigin } from "@/lib/site-url";
import {
  MAILMYPDF_MCP_TOOLS,
  MCP_CONNECTOR_VERSION,
  MCP_PROTECTED_TOOL_NAMES,
  MCP_PROTOCOL_VERSION,
  getMcpTool,
} from "./tool-catalog";
import { executeMcpTool, McpToolExecutionError } from "./workflow-tools.server";

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

function json(value: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function rpcError(id: unknown, code: number, message: string, data?: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function requestOrigin(request: Request): string {
  return getSiteOrigin() ?? new URL(request.url).origin;
}

function authChallenge(request: Request, scopes: readonly string[]): string {
  const metadataUrl = new URL("/.well-known/oauth-protected-resource", requestOrigin(request)).toString();
  const scope = scopes.length ? `, scope="${scopes.join(" ")}"` : "";
  return `Bearer resource_metadata="${metadataUrl}"${scope}`;
}

function toolScopes(name: string): string[] {
  const tool = getMcpTool(name);
  if (!tool) return [];
  return tool.securitySchemes.flatMap((scheme) => (scheme.type === "oauth2" ? [...scheme.scopes] : []));
}

function validateModernHeaders(request: Request, message: JsonRpcRequest): Response | null {
  const protocol = request.headers.get("mcp-protocol-version");
  if (protocol !== MCP_PROTOCOL_VERSION) return null;

  const method = typeof message.method === "string" ? message.method : "";
  const headerMethod = request.headers.get("mcp-method");
  if (!headerMethod || headerMethod !== method) {
    return json(rpcError(message.id, -32020, "Mcp-Method header does not match the JSON-RPC method"), 400);
  }

  if (method === "tools/call") {
    const params = message.params && typeof message.params === "object" && !Array.isArray(message.params)
      ? message.params as Record<string, unknown>
      : {};
    const name = typeof params.name === "string" ? params.name : "";
    const headerName = request.headers.get("mcp-name");
    if (!headerName || headerName !== name) {
      return json(rpcError(message.id, -32020, "Mcp-Name header does not match the tool name"), 400);
    }
  }

  return null;
}

async function requireToolAuth(request: Request, toolName: string): Promise<Response | null> {
  if (!MCP_PROTECTED_TOOL_NAMES.has(toolName)) return null;
  const scopes = toolScopes(toolName);

  try {
    await requireAuthenticatedUser(request);
    return null;
  } catch (error) {
    if (!(error instanceof AuthenticationError)) throw error;
    return json(
      rpcError(null, -32001, "MailMyPDF account connection required"),
      401,
      { "www-authenticate": authChallenge(request, scopes) },
    );
  }
}

function completeToolResult(value: unknown) {
  return {
    resultType: "complete",
    content: [{ type: "text", text: JSON.stringify(value) }],
    structuredContent: value,
    isError: false,
    _meta: {
      "io.modelcontextprotocol/serverInfo": {
        name: "MailMyPDF",
        version: MCP_CONNECTOR_VERSION,
      },
    },
  };
}

function failedToolResult(message: string, details?: unknown) {
  return {
    resultType: "complete",
    content: [{ type: "text", text: message }],
    structuredContent: {
      ok: false,
      error: message,
      ...(details === undefined ? {} : { details }),
    },
    isError: true,
    _meta: {
      "io.modelcontextprotocol/serverInfo": {
        name: "MailMyPDF",
        version: MCP_CONNECTOR_VERSION,
      },
    },
  };
}

export async function handleMailMyPdfMcpRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return json(
      {
        name: "MailMyPDF MCP",
        version: MCP_CONNECTOR_VERSION,
        protocol: MCP_PROTOCOL_VERSION,
        endpoint: "/api/mcp",
      },
      405,
      { allow: "POST" },
    );
  }

  if (request.method !== "POST") {
    return json(rpcError(null, -32600, "Only POST is supported"), 405, { allow: "POST" });
  }

  let message: JsonRpcRequest;
  try {
    message = await request.json() as JsonRpcRequest;
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return json(rpcError(message.id, -32600, "Invalid JSON-RPC request"), 400);
  }

  const headerError = validateModernHeaders(request, message);
  if (headerError) return headerError;

  if (message.method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (message.method === "initialize") {
    const params =
      message.params && typeof message.params === "object" && !Array.isArray(message.params)
        ? message.params as Record<string, unknown>
        : {};
    const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-11-25";

    return json(rpcResult(message.id, {
      protocolVersion: requested === MCP_PROTOCOL_VERSION ? MCP_PROTOCOL_VERSION : requested,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "MailMyPDF", version: MCP_CONNECTOR_VERSION },
      instructions:
        "Use MailMyPDF to find document workflows, create owner-scoped matters, generate reviewable drafts, preview exact mailing packets, record explicit approval, and prepare secure checkout. Never claim a document was paid or mailed unless MailMyPDF returns that state.",
    }));
  }

  if (message.method === "server/discover") {
    return json(rpcResult(message.id, {
      resultType: "complete",
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "MailMyPDF", version: MCP_CONNECTOR_VERSION },
      instructions:
        "Use explicit packet review and approval before checkout. MailMyPDF never accepts raw payment-card data through MCP.",
    }));
  }

  if (message.method === "ping") {
    return json(rpcResult(message.id, { resultType: "complete" }));
  }

  if (message.method === "tools/list") {
    return json(rpcResult(message.id, {
      resultType: "complete",
      tools: MAILMYPDF_MCP_TOOLS,
      ttlMs: 300_000,
      cacheScope: "public",
    }));
  }

  if (message.method === "tools/call") {
    const params =
      message.params && typeof message.params === "object" && !Array.isArray(message.params)
        ? message.params as Record<string, unknown>
        : null;

    if (!params || typeof params.name !== "string") {
      return json(rpcError(message.id, -32602, "tools/call requires a tool name"), 400);
    }

    const toolName = params.name;
    if (!getMcpTool(toolName)) {
      return json(rpcError(message.id, -32602, `Unknown tool: ${toolName}`), 400);
    }

    const authResponse = await requireToolAuth(request, toolName);
    if (authResponse) return authResponse;

    try {
      const value = await executeMcpTool(request, toolName, params.arguments ?? {});
      return json(rpcResult(message.id, completeToolResult(value)));
    } catch (error) {
      if (error instanceof McpToolExecutionError) {
        if (error.status === 401) {
          return json(
            rpcError(message.id, -32001, "MailMyPDF account connection required"),
            401,
            { "www-authenticate": authChallenge(request, toolScopes(toolName)) },
          );
        }
        return json(rpcResult(message.id, failedToolResult(error.message, error.details)));
      }
      if (error instanceof AuthenticationError) {
        return json(
          rpcError(message.id, -32001, "MailMyPDF account connection required"),
          401,
          { "www-authenticate": authChallenge(request, toolScopes(toolName)) },
        );
      }
      const messageText = error instanceof Error ? error.message : "MailMyPDF MCP tool failed";
      return json(rpcResult(message.id, failedToolResult(messageText)));
    }
  }

  return json(rpcError(message.id, -32601, "Method not found"), 404);
}
